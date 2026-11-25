-- Renouvellement mensuel des groupes.
-- Quelques jours avant la fin du mois (5 par défaut), le groupe repasse en paiement : chaque membre paie
-- le mois suivant avant la fin du mois en cours ; de nouveaux membres peuvent encore rejoindre.
-- À l'échéance (ou dès que tous ont payé), 4 nouvelles semaines de séances commencent après le mois en cours,
-- pour les membres qui ont payé. Moins de 3 parts payées : le groupe se termine et ces parts sont « à rembourser ».
-- Chaque paiement est rattaché à un mois (cycle) du groupe.

alter table public.groups add column cycle int not null default 1;
alter table public.payments add column group_cycle int;
update public.payments set group_cycle = 1 where group_member_id is not null;
grant select (group_cycle) on public.payments to authenticated;
alter table public.pricing_settings add column group_renewal_days int not null default 5 check (group_renewal_days between 1 and 20);

create or replace function private.activate_group(p_group uuid) returns void
language plpgsql set search_path = '' as $$
declare
  g public.groups;
  t public.teachers;
  s public.pricing_settings;
  per_session int;
  first_at timestamptz;
  slot jsonb;
  d0 date;
  k int;
  slot_at timestamptz;
  gs_id uuid;
  m record;
begin
  select * into g from public.groups where id = p_group for update;
  select * into t from public.teachers where id = g.teacher_id;
  select * into s from public.pricing_settings;
  update public.group_members set status = 'dropped' where group_id = g.id and status = 'joined';
  select sessions into per_session from public.plans where id = g.plan_id;
  -- Renouvellement : le nouveau mois commence après la fin du mois en cours.
  first_at := greatest(now() + make_interval(mins => s.booking_lead_minutes), coalesce(g.ends_on, '-infinity'::timestamptz));
  d0 := (first_at at time zone t.timezone)::date;

  for slot in select * from jsonb_array_elements(g.slots) loop
    k := 0;
    -- Les 4 prochaines occurrences du créneau, dans le fuseau du professeur.
    for i in 0..5 loop
      exit when k >= 4;
      slot_at := ((d0 + ((((slot ->> 'weekday')::int - extract(dow from d0)::int) + 7) % 7) + 7 * i)
        + make_interval(mins => (slot ->> 'start')::int)) at time zone t.timezone;
      continue when slot_at < first_at;
      k := k + 1;
      -- Créneau déjà pris par un cours individuel : cette occurrence est sautée.
      continue when exists (
        select 1 from public.bookings b where b.teacher_id = t.id and b.status in ('scheduled', 'pending_payment')
          and b.group_session_id is null and private.slot_range(b.starts_at, b.minutes) && private.slot_range(slot_at, s.course_minutes)
      );
      begin
        insert into public.group_sessions (group_id, teacher_id, subject, starts_at, minutes)
        values (g.id, t.id, g.subject, slot_at, s.course_minutes) returning id into gs_id;
      exception when exclusion_violation then
        continue;
      end;
      for m in
        select gm.learner_id, p.amount, p.currency from public.group_members gm
        join public.payments p on p.group_member_id = gm.id and p.status = 'succeeded' and p.group_cycle = g.cycle
        where gm.group_id = g.id and gm.status = 'paid'
      loop
        insert into public.bookings (learner_id, teacher_id, kind, subject, starts_at, minutes, amount, currency, status, group_session_id)
        values (m.learner_id, t.id, 'group', g.subject, slot_at, s.course_minutes, round(m.amount / per_session, 2), m.currency, 'scheduled', gs_id);
      end loop;
    end loop;
  end loop;

  update public.groups set status = 'active', starts_on = first_at, ends_on = first_at + interval '28 days' where id = g.id;
end
$$;

create or replace function private.group_try_activate(p_group uuid) returns text
language plpgsql set search_path = '' as $$
declare
  g public.groups;
  s public.pricing_settings;
  paid int;
  waiting int;
begin
  select * into g from public.groups where id = p_group for update;
  if g.status <> 'payment' then return g.status; end if;
  select * into s from public.pricing_settings;
  select count(*) filter (where status = 'paid'), count(*) filter (where status = 'joined') into paid, waiting
    from public.group_members where group_id = g.id;
  if paid >= s.group_min and (waiting = 0 or g.payment_deadline <= now()) then
    perform private.activate_group(g.id);
    return 'active';
  end if;
  if g.payment_deadline <= now() then
    -- Moins de 3 parts : un premier mois est annulé, un renouvellement met fin au groupe.
    update public.groups set status = case when g.starts_on is null then 'cancelled' else 'ended' end where id = g.id;
    update public.payments p set status = 'refund_due', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'succeeded' and p.group_cycle = g.cycle;
    update public.payments p set status = 'failed', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'pending';
    return case when g.starts_on is null then 'cancelled' else 'ended' end;
  end if;
  return 'payment';
end
$$;

create or replace function private.expire_group_payments() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.groups where status = 'payment' and payment_deadline <= now() loop
    perform private.group_try_activate(r.id);
    n := n + 1;
  end loop;
  -- Renouvellement : quelques jours avant la fin du mois, chaque membre doit payer le mois suivant
  -- (même circuit que le premier paiement ; échéance = fin du mois en cours).
  for r in
    select id from public.groups
    where status = 'active' and ends_on is not null
      and ends_on - make_interval(days => (select group_renewal_days from public.pricing_settings)) <= now()
  loop
    update public.groups set status = 'payment', payment_deadline = ends_on, cycle = cycle + 1 where id = r.id;
    update public.group_members set status = 'joined' where group_id = r.id and status = 'paid';
  end loop;
  return n;
end
$$;

create or replace function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
  s public.pricing_settings;
begin
  select * into g from public.groups where id = p_group for update;
  if g.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if g.status not in ('forming', 'payment') then raise exception 'group_closed' using errcode = 'P0001'; end if;
  if private.owns_family(g.organizer_family) and g.starts_on is null then
    update public.groups set status = 'cancelled' where id = g.id;
    update public.payments p set status = 'refund_due', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'succeeded';
    update public.payments p set status = 'failed', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'pending';
    return;
  end if;
  update public.group_members set status = 'left'
    where group_id = g.id and status = 'joined' and private.owns_family(family_id);
  if not found then raise exception 'not_member' using errcode = 'P0001'; end if;
  select * into s from public.pricing_settings;
  if g.status = 'payment' and g.starts_on is null and private.active_members(g.id) < s.group_min then
    update public.groups set status = 'forming', payment_deadline = null where id = g.id;
  end if;
end
$$;

create or replace function public.start_group_payment(p_member uuid, p_method text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  gm public.group_members;
  g public.groups;
  fam public.families;
  share record;
  p_id uuid;
begin
  select * into gm from public.group_members where id = p_member for update;
  if gm.id is null or not private.owns_family(gm.family_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into g from public.groups where id = gm.group_id;
  if g.status <> 'payment' or g.payment_deadline <= now() or gm.status <> 'joined' then raise exception 'not_payable' using errcode = 'P0001'; end if;
  select * into fam from public.families where id = gm.family_id;
  if (select payment_provider from public.countries where code = fam.country) <> 'bictorys' then
    raise exception 'payment_not_available' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.countries c where c.code = fam.country and coalesce(p_method, c.payments[1]) = any (c.payments)) then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;
  select id into p_id from public.payments where group_member_id = gm.id and status = 'pending' and group_cycle = g.cycle order by created_at desc limit 1;
  if p_id is null then
    select * into share from private.group_share(g.id, fam.country);
    insert into public.payments (family_id, amount, currency, method, provider, status, group_member_id, group_cycle)
    values (fam.id, share.amount, share.currency,
      coalesce(p_method, (select c.payments[1] from public.countries c where c.code = fam.country)), 'bictorys', 'pending', gm.id, g.cycle)
    returning id into p_id;
  end if;
  return jsonb_build_object('payment_id', p_id);
end
$$;

create or replace function public.group_detail(p_group uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g public.groups;
  fam public.families;
  share_amount numeric;
  share_currency text;
  is_member boolean;
begin
  select * into g from public.groups where id = p_group;
  if g.id is null or not private.can_see_group(g.id) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into fam from public.families where owner_id = (select auth.uid());
  if fam.id is not null then select x.amount, x.currency into share_amount, share_currency from private.group_share(g.id, fam.country) x; end if;
  is_member := exists (select 1 from public.group_members m where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id));
  return jsonb_build_object(
    'id', g.id, 'teacherId', g.teacher_id, 'teacherName', (select name from public.teachers where id = g.teacher_id),
    'teacherTimezone', (select timezone from public.teachers where id = g.teacher_id),
    'subject', g.subject, 'planId', g.plan_id, 'slots', g.slots, 'status', g.status,
    'paymentDeadline', g.payment_deadline, 'startsOn', g.starts_on, 'endsOn', g.ends_on,
    'renewal', g.status = 'payment' and g.starts_on is not null, 'cycle', g.cycle,
    'inviteCode', case when is_member or private.owns_family(g.organizer_family) then g.invite_code end,
    'isOrganizer', private.owns_family(g.organizer_family), 'isTeacher', private.is_teacher(g.teacher_id),
    'share', case when share_amount is not null then jsonb_build_object('amount', share_amount, 'currency', share_currency) end,
    'min', (select group_min from public.pricing_settings), 'max', (select group_max from public.pricing_settings),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', case when private.owns_family(m.family_id) then l.name else split_part(l.name, ' ', 1) end, 'status', m.status, 'mine', private.owns_family(m.family_id),
        'paying', exists (select 1 from public.payments p where p.group_member_id = m.id and p.status = 'pending')
      ) order by m.joined_at), '[]'::jsonb)
      from public.group_members m join public.learners l on l.id = m.learner_id
      where m.group_id = g.id and m.status in ('joined', 'paid')),
    'sessions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'startsAt', s.starts_at, 'minutes', s.minutes, 'status', s.status) order by s.starts_at), '[]'::jsonb)
      from public.group_sessions s where s.group_id = g.id)
  );
end
$$;

-- Un paiement d'un mois précédent arrivé en retard ne compte pas pour le nouveau mois.
create or replace function public.bictorys_settle(
  p_payment uuid, p_status text, p_amount numeric default null, p_currency text default null,
  p_ref text default null, p_payload jsonb default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  b public.bookings;
  gm public.group_members;
  g public.groups;
begin
  select * into pay from public.payments where id = p_payment and provider = 'bictorys' for update;
  if pay.id is null then return 'unknown_payment'; end if;
  if pay.status in ('succeeded', 'refund_due', 'refunded') then return 'already_settled'; end if;

  update public.payments set provider_payload = coalesce(p_payload, provider_payload),
    provider_ref = coalesce(provider_ref, p_ref), updated_at = now() where id = pay.id;

  -- Part d'un abonnement de groupe.
  if pay.group_member_id is not null then
    if p_status = 'failed' then
      update public.payments set status = 'failed' where id = pay.id and status = 'pending';
      return 'failed';
    end if;
    if p_status <> 'succeeded' then return 'ignored'; end if;
    if p_amount is null or p_amount < pay.amount or upper(coalesce(p_currency, '')) <> pay.currency then
      update public.payments set status = 'refund_due', paid_at = now() where id = pay.id;
      return 'amount_mismatch';
    end if;
    select * into gm from public.group_members where id = pay.group_member_id for update;
    select * into g from public.groups where id = gm.group_id for update;
    if g.status <> 'payment' or gm.status <> 'joined' or pay.group_cycle is distinct from g.cycle then
      -- Groupe annulé, démarré sans ce membre, membre parti ou paiement d'un mois passé : payé, mais à rembourser.
      update public.payments set status = 'refund_due', paid_at = now() where id = pay.id;
      return 'group_closed';
    end if;
    update public.payments set status = 'succeeded', paid_at = now() where id = pay.id;
    update public.group_members set status = 'paid' where id = gm.id;
    return 'group_' || private.group_try_activate(g.id);
  end if;

  select * into b from public.bookings where id = pay.booking_id for update;

  if p_status = 'succeeded' then
    if p_amount is null or p_amount < pay.amount or upper(coalesce(p_currency, '')) <> pay.currency then
      update public.payments set status = 'refund_due', paid_at = now() where id = pay.id;
      if b.status = 'pending_payment' then
        update public.bookings set status = 'cancelled', hold_until = null where id = b.id;
      end if;
      return 'amount_mismatch';
    end if;

    update public.payments set status = 'succeeded', paid_at = now() where id = pay.id;
    if b.id is null or b.status not in ('pending_payment', 'cancelled') then return 'paid'; end if;
    begin
      update public.bookings set status = 'scheduled', hold_until = null where id = b.id;
      update public.subscriptions set active = true where id = pay.subscription_id;
      return 'confirmed';
    exception when exclusion_violation or unique_violation then
      update public.bookings set status = 'cancelled', hold_until = null where id = b.id;
      update public.payments set status = 'refund_due' where id = pay.id;
      return 'slot_lost';
    end;
  end if;

  if p_status = 'failed' then
    update public.payments set status = 'failed' where id = pay.id and status = 'pending';
    if b.status = 'pending_payment' then
      update public.bookings set status = 'cancelled', hold_until = null where id = b.id;
      if b.kind = 'plan' and b.subscription_id is not null then
        update public.subscriptions set active = false where id = b.subscription_id and id = pay.subscription_id;
      end if;
    end if;
    return 'failed';
  end if;

  return 'ignored';
end
$$;
