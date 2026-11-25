-- Abonnements de groupe : 3 à 10 élèves, un professeur, des créneaux fixes chaque semaine.
-- 1. Un organisateur crée le groupe (formule + créneaux) et partage un lien d'invitation.
-- 2. Au 3e inscrit, chacun a 48 h pour payer sa part (tarif du professeur moins la remise de groupe).
-- 3. À la fin du délai (ou dès que tous ont payé), le groupe démarre avec les payés s'ils sont 3 au moins :
--    séances de groupe sur 4 semaines, et une réservation par membre rattachée à chaque séance
--    (suivi, compte rendu, séquestre et versement au professeur passent par les réservations, comme d'habitude).
-- Sinon le groupe est annulé et les parts payées passent « à rembourser ».

alter table public.pricing_settings
  add column group_discount numeric not null default 0.4 check (group_discount >= 0 and group_discount < 1),
  add column group_min int not null default 3 check (group_min >= 2),
  add column group_max int not null default 10 check (group_max >= 3),
  add column group_payment_hours int not null default 48 check (group_payment_hours between 1 and 336);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id text not null references public.teachers (id),
  organizer_family uuid not null references public.families (id) on delete cascade,
  subject text not null,
  plan_id text not null references public.plans (id),
  slots jsonb not null,
  invite_code text not null unique,
  status text not null default 'forming' check (status in ('forming', 'payment', 'active', 'cancelled', 'ended')),
  payment_deadline timestamptz,
  starts_on timestamptz,
  ends_on timestamptz,
  created_at timestamptz not null default now()
);
create index on public.groups (teacher_id);
create index on public.groups (organizer_family);
create index on public.groups (status, payment_deadline) where status = 'payment';
comment on table public.groups is 'Abonnements de groupe. slots : [{weekday, start}] en minutes locales du fuseau du professeur (0 = dimanche).';

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  learner_id uuid not null references public.learners (id) on delete cascade,
  status text not null default 'joined' check (status in ('joined', 'paid', 'left', 'dropped')),
  joined_at timestamptz not null default now(),
  unique (group_id, learner_id)
);
create index on public.group_members (family_id);
create index on public.group_members (learner_id);

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  teacher_id text not null references public.teachers (id),
  subject text not null,
  starts_at timestamptz not null,
  minutes int not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'delivered', 'cancelled')),
  delivered_at timestamptz,
  constraint group_sessions_no_overlap exclude using gist (
    teacher_id with =,
    private.slot_range(starts_at, minutes) with &&
  ) where (status = 'scheduled')
);
create index on public.group_sessions (group_id, starts_at);
create index on public.group_sessions (teacher_id, starts_at);

-- Réservations : une par membre et par séance de groupe ; elles ne se chevauchent pas entre elles
-- au sens du créneau du professeur (c'est la séance de groupe qui occupe le créneau).
alter table public.bookings add column group_session_id uuid references public.group_sessions (id) on delete set null;
create index on public.bookings (group_session_id);
alter table public.bookings drop constraint bookings_kind_check;
alter table public.bookings add constraint bookings_kind_check check (kind in ('trial', 'plan', 'group'));
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  teacher_id with =,
  private.slot_range(starts_at, minutes) with &&
) where (status in ('scheduled', 'pending_payment') and group_session_id is null);

alter table public.payments add column group_member_id uuid references public.group_members (id) on delete set null;
create index on public.payments (group_member_id);
grant select (group_member_id) on public.payments to authenticated;

-- Lecture : membres actifs du groupe, organisateur et professeur.
create function private.can_see_group(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.groups g where g.id = p_group and (
      private.owns_family(g.organizer_family) or private.is_teacher(g.teacher_id)
      or exists (select 1 from public.group_members m where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id))
    )
  )
$$;
grant execute on function private.can_see_group(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_sessions enable row level security;
grant select on public.groups, public.group_members, public.group_sessions to authenticated;
create policy "groupe visible (lecture)" on public.groups for select to authenticated using (private.can_see_group(id));
create policy "membres visibles (lecture)" on public.group_members for select to authenticated using (private.can_see_group(group_id));
create policy "séances visibles (lecture)" on public.group_sessions for select to authenticated using (private.can_see_group(group_id));

-- Outils ------------------------------------------------------------------------------------

/** Prix de la part d'un membre pour un mois : tarif du pays × séances de la formule × (1 − remise de groupe). */
create function private.group_share(p_group uuid, p_country text, out amount numeric, out currency text)
language plpgsql stable set search_path = '' as $$
declare
  g public.groups;
  p record;
begin
  select * into g from public.groups where id = p_group;
  select * into p from private.session_price(g.teacher_id, p_country);
  currency := p.currency;
  amount := private.round_money(p.amount * (select sessions from public.plans where id = g.plan_id)
    * (1 - (select group_discount from public.pricing_settings)), p.currency);
end
$$;

create function private.active_members(p_group uuid) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from public.group_members where group_id = p_group and status in ('joined', 'paid')
$$;

/** Démarre le groupe : séances sur 4 semaines et une réservation par membre payé. */
create function private.activate_group(p_group uuid) returns void
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
  first_at := now() + make_interval(mins => s.booking_lead_minutes);
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
        join public.payments p on p.group_member_id = gm.id and p.status = 'succeeded'
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

/** Fait avancer un groupe en attente de paiement : démarrage, ou annulation si moins de 3 parts payées à l'échéance. */
create function private.group_try_activate(p_group uuid) returns text
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
    update public.groups set status = 'cancelled' where id = g.id;
    update public.payments p set status = 'refund_due', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'succeeded';
    update public.payments p set status = 'failed', updated_at = now()
      from public.group_members gm where p.group_member_id = gm.id and gm.group_id = g.id and p.status = 'pending';
    return 'cancelled';
  end if;
  return 'payment';
end
$$;

create function private.expire_group_payments() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.groups where status = 'payment' and payment_deadline <= now() loop
    perform private.group_try_activate(r.id);
    n := n + 1;
  end loop;
  -- Fin du mois : le groupe se termine (le renouvellement viendra dans un second temps).
  update public.groups set status = 'ended' where status = 'active' and ends_on <= now();
  return n;
end
$$;
revoke execute on function private.expire_group_payments() from public, anon, authenticated;
select cron.schedule('dini-group-payments', '*/10 * * * *', 'select private.expire_group_payments()');

-- Actions des familles -----------------------------------------------------------------------

/** Crée un groupe : l'élève de l'organisateur en est le premier membre. Renvoie l'identifiant du groupe. */
create function public.create_group(p_learner uuid, p_teacher text, p_subject text, p_plan text, p_slots jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  fam public.families;
  s public.pricing_settings;
  per_week int;
  slot jsonb;
  seen text[] := '{}';
  g_id uuid;
begin
  select * into fam from public.families where owner_id = (select auth.uid());
  if fam.id is null or private.family_of_learner(p_learner) is distinct from fam.id then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.teachers where id = p_teacher and published and p_subject = any (subjects)) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if (select payment_provider from public.countries where code = fam.country) <> 'bictorys' then
    raise exception 'payment_not_available' using errcode = 'P0001';
  end if;
  select ceil(sessions / 4.0)::int into per_week from public.plans where id = p_plan;
  if per_week is null then raise exception 'invalid_choice' using errcode = '22023'; end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> per_week then raise exception 'invalid_slots' using errcode = '22023'; end if;
  select * into s from public.pricing_settings;
  for slot in select * from jsonb_array_elements(p_slots) loop
    if (slot ->> 'weekday') is null or (slot ->> 'start') is null or (slot ->> 'weekday') || ':' || (slot ->> 'start') = any (seen)
      or not exists (
        select 1 from public.availability_rules r where r.teacher_id = p_teacher and r.weekday = (slot ->> 'weekday')::int
          and (slot ->> 'start')::int >= r.start_min and (slot ->> 'start')::int + s.course_minutes <= r.end_min
          and ((slot ->> 'start')::int - r.start_min) % 30 = 0
      ) then
      raise exception 'invalid_slots' using errcode = '22023';
    end if;
    seen := seen || ((slot ->> 'weekday') || ':' || (slot ->> 'start'));
  end loop;

  insert into public.groups (teacher_id, organizer_family, subject, plan_id, slots, invite_code)
  values (p_teacher, fam.id, p_subject, p_plan,
    (select jsonb_agg(jsonb_build_object('weekday', (x ->> 'weekday')::int, 'start', (x ->> 'start')::int)) from jsonb_array_elements(p_slots) x),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
  returning id into g_id;
  insert into public.group_members (group_id, family_id, learner_id) values (g_id, fam.id, p_learner);
  return g_id;
end
$$;

/** Rejoint un groupe avec le lien d'invitation. Au 3e membre, la période de paiement s'ouvre. */
create function public.join_group(p_code text, p_learner uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  fam public.families;
  g public.groups;
  s public.pricing_settings;
  n int;
begin
  select * into fam from public.families where owner_id = (select auth.uid());
  if fam.id is null or private.family_of_learner(p_learner) is distinct from fam.id then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into g from public.groups where invite_code = upper(trim(p_code)) for update;
  if g.id is null then raise exception 'group_not_found' using errcode = 'P0001'; end if;
  if g.status not in ('forming', 'payment') or (g.status = 'payment' and g.payment_deadline <= now()) then
    raise exception 'group_closed' using errcode = 'P0001';
  end if;
  if (select payment_provider from public.countries where code = fam.country) <> 'bictorys' then
    raise exception 'payment_not_available' using errcode = 'P0001';
  end if;
  select * into s from public.pricing_settings;
  if exists (select 1 from public.group_members where group_id = g.id and learner_id = p_learner and status in ('joined', 'paid')) then
    return g.id;
  end if;
  if private.active_members(g.id) >= s.group_max then raise exception 'group_full' using errcode = 'P0001'; end if;
  insert into public.group_members (group_id, family_id, learner_id) values (g.id, fam.id, p_learner)
  on conflict (group_id, learner_id) do update set status = 'joined', joined_at = now();
  n := private.active_members(g.id);
  if g.status = 'forming' and n >= s.group_min then
    update public.groups set status = 'payment', payment_deadline = now() + make_interval(hours => s.group_payment_hours) where id = g.id;
  end if;
  return g.id;
end
$$;

/** Quitte un groupe (part non payée). L'organisateur annule le groupe tant qu'il n'a pas démarré. */
create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
  s public.pricing_settings;
begin
  select * into g from public.groups where id = p_group for update;
  if g.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if g.status not in ('forming', 'payment') then raise exception 'group_closed' using errcode = 'P0001'; end if;
  if private.owns_family(g.organizer_family) then
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
  if g.status = 'payment' and private.active_members(g.id) < s.group_min then
    update public.groups set status = 'forming', payment_deadline = null where id = g.id;
  end if;
end
$$;

/** Prépare le paiement Bictorys de la part d'un membre (réutilise le paiement en attente s'il existe). */
create function public.start_group_payment(p_member uuid, p_method text default null) returns jsonb
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
  select id into p_id from public.payments where group_member_id = gm.id and status = 'pending' order by created_at desc limit 1;
  if p_id is null then
    select * into share from private.group_share(g.id, fam.country);
    insert into public.payments (family_id, amount, currency, method, provider, status, group_member_id)
    values (fam.id, share.amount, share.currency,
      coalesce(p_method, (select c.payments[1] from public.countries c where c.code = fam.country)), 'bictorys', 'pending', gm.id)
    returning id into p_id;
  end if;
  return jsonb_build_object('payment_id', p_id);
end
$$;

/** Détail d'un groupe pour ses membres, son organisateur et son professeur. */
create function public.group_detail(p_group uuid) returns jsonb
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
    'inviteCode', case when is_member or private.owns_family(g.organizer_family) then g.invite_code end,
    'isOrganizer', private.owns_family(g.organizer_family), 'isTeacher', private.is_teacher(g.teacher_id),
    'share', case when share_amount is not null then jsonb_build_object('amount', share_amount, 'currency', share_currency) end,
    'min', (select group_min from public.pricing_settings), 'max', (select group_max from public.pricing_settings),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', split_part(l.name, ' ', 1), 'status', m.status, 'mine', private.owns_family(m.family_id),
        'paying', exists (select 1 from public.payments p where p.group_member_id = m.id and p.status = 'pending')
      ) order by m.joined_at), '[]'::jsonb)
      from public.group_members m join public.learners l on l.id = m.learner_id
      where m.group_id = g.id and m.status in ('joined', 'paid')),
    'sessions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'startsAt', s.starts_at, 'minutes', s.minutes, 'status', s.status) order by s.starts_at), '[]'::jsonb)
      from public.group_sessions s where s.group_id = g.id)
  );
end
$$;

/** Aperçu d'un groupe à partir du lien d'invitation (avant de le rejoindre). */
create function public.group_by_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g public.groups;
  fam public.families;
  share_amount numeric;
  share_currency text;
begin
  select * into g from public.groups where invite_code = upper(trim(p_code));
  if g.id is null then raise exception 'group_not_found' using errcode = 'P0001'; end if;
  select * into fam from public.families where owner_id = (select auth.uid());
  if fam.id is not null then select x.amount, x.currency into share_amount, share_currency from private.group_share(g.id, fam.country) x; end if;
  return jsonb_build_object(
    'id', g.id, 'teacherId', g.teacher_id, 'teacherName', (select name from public.teachers where id = g.teacher_id),
    'teacherTimezone', (select timezone from public.teachers where id = g.teacher_id),
    'subject', g.subject, 'planId', g.plan_id, 'slots', g.slots, 'status', g.status, 'paymentDeadline', g.payment_deadline,
    'members', private.active_members(g.id), 'max', (select group_max from public.pricing_settings), 'min', (select group_min from public.pricing_settings),
    'isMember', exists (select 1 from public.group_members m where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id)),
    'share', case when share_amount is not null then jsonb_build_object('amount', share_amount, 'currency', share_currency) end
  );
end
$$;

/** Groupes de l'utilisateur : comme famille (membre ou organisateur) et comme professeur. */
create function public.my_groups() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'teacherName', t.name, 'subject', g.subject, 'planId', g.plan_id, 'status', g.status,
      'members', private.active_members(g.id), 'paymentDeadline', g.payment_deadline,
      'nextSession', (select min(s.starts_at) from public.group_sessions s where s.group_id = g.id and s.status = 'scheduled' and s.starts_at > now() - interval '1 hour'),
      'asTeacher', private.is_teacher(g.teacher_id)
    ) order by g.created_at desc), '[]'::jsonb)
  from public.groups g join public.teachers t on t.id = g.teacher_id
  where g.status <> 'cancelled' and (
    private.is_teacher(g.teacher_id)
    or exists (select 1 from public.group_members m where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id))
  )
$$;

/** Le professeur valide une séance de groupe : compte rendu copié pour chaque membre, séquestre comme d'habitude. */
create function public.deliver_group_session(p_session uuid, p_report jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  gs public.group_sessions;
  b record;
begin
  select * into gs from public.group_sessions where id = p_session and teacher_id = t.id for update;
  if gs.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if gs.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  if gs.starts_at > now() then raise exception 'not_started' using errcode = 'P0001'; end if;
  if length(trim(coalesce(p_report ->> 'covered', ''))) = 0 then raise exception 'report_required' using errcode = '22023'; end if;
  update public.group_sessions set status = 'delivered', delivered_at = now() where id = gs.id;
  update public.teachers set hours_taught = hours_taught + gs.minutes / 60.0 where id = t.id;
  for b in select id from public.bookings where group_session_id = gs.id and status = 'scheduled' for update loop
    update public.bookings set status = 'delivered', delivered_at = now() where id = b.id;
    insert into public.session_reports (booking_id, covered, surah, ayah_from, ayah_to, tajwid_notes, homework, comment)
    values (b.id, left(p_report ->> 'covered', 500), (p_report ->> 'surah')::int, (p_report ->> 'ayahFrom')::int, (p_report ->> 'ayahTo')::int,
      left(coalesce(p_report ->> 'tajwidNotes', ''), 2000), left(coalesce(p_report ->> 'homework', ''), 2000), left(coalesce(p_report ->> 'comment', ''), 2000));
  end loop;
end
$$;

/** Séances de groupe à venir ou à valider, pour le professeur connecté. */
create function public.my_group_sessions() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'groupId', s.group_id, 'subject', s.subject, 'startsAt', s.starts_at, 'minutes', s.minutes, 'status', s.status,
      'learners', (select coalesce(jsonb_agg(split_part(l.name, ' ', 1) order by l.name), '[]'::jsonb)
        from public.bookings b join public.learners l on l.id = b.learner_id where b.group_session_id = s.id)
    ) order by s.starts_at), '[]'::jsonb)
  from public.group_sessions s
  where s.teacher_id = private.my_teacher_id() and s.status = 'scheduled'
$$;

grant execute on function public.create_group(uuid, text, text, text, jsonb), public.join_group(text, uuid), public.leave_group(uuid),
  public.start_group_payment(uuid, text), public.group_detail(uuid), public.group_by_code(text), public.my_groups(),
  public.deliver_group_session(uuid, jsonb), public.my_group_sessions() to authenticated;
revoke execute on function public.create_group(uuid, text, text, text, jsonb), public.join_group(text, uuid), public.leave_group(uuid),
  public.start_group_payment(uuid, text), public.group_detail(uuid), public.group_by_code(text), public.my_groups(),
  public.deliver_group_session(uuid, jsonb), public.my_group_sessions() from public, anon;

-- Créneaux libres : les séances de groupe occupent aussi l'agenda du professeur --------------

create or replace function public.free_slots(p_teacher text, p_from timestamptz, p_days int default 7, p_minutes int default null)
returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.pricing_settings),
  len as (select coalesce(p_minutes, s.course_minutes) as dur from s),
  t as (
    select timezone as tz from public.teachers where id = p_teacher and published
  ),
  days as (
    select ((p_from at time zone t.tz)::date + i) as d, t.tz
    from t, generate_series(0, least(greatest(p_days, 1), 35) - 1) i
  ),
  slots as (
    select ((days.d + make_interval(mins => st)) at time zone days.tz) as at
    from days, len
    join public.availability_rules r on r.teacher_id = p_teacher
    cross join lateral generate_series(r.start_min, r.end_min - len.dur, 30) st
    where r.weekday = extract(dow from days.d)::int
  )
  select distinct sl.at from slots sl, len
  where sl.at >= p_from
    and sl.at >= now() + make_interval(mins => (select booking_lead_minutes from public.pricing_settings))
    and not exists (
      select 1 from public.bookings b
      where b.teacher_id = p_teacher and b.status in ('scheduled', 'pending_payment') and b.group_session_id is null
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(sl.at, sl.at + make_interval(mins => len.dur))
    )
    and not exists (
      select 1 from public.group_sessions g
      where g.teacher_id = p_teacher and g.status = 'scheduled'
        and tstzrange(g.starts_at, g.starts_at + make_interval(mins => g.minutes)) && tstzrange(sl.at, sl.at + make_interval(mins => len.dur))
    )
  order by 1
$$;

-- Vidéo : la salle d'une séance de groupe est partagée (nommée d'après la séance de groupe) ---

create or replace function public.video_access(p_booking uuid)
returns table (booking_id uuid, room text, role text, display_name text, opens_at timestamptz, closes_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.bookings;
  gs public.group_sessions;
  who text;
  label text;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null then
    -- Séance de groupe, ouverte par le professeur.
    select * into gs from public.group_sessions where id = p_booking;
    if gs.id is null or not private.is_teacher(gs.teacher_id) then raise exception 'forbidden' using errcode = '42501'; end if;
    if gs.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
    if now() < gs.starts_at - interval '10 minutes' then raise exception 'room_not_open' using errcode = 'P0001'; end if;
    if now() > gs.starts_at + make_interval(mins => gs.minutes) + interval '15 minutes' then raise exception 'room_closed' using errcode = 'P0001'; end if;
    return query select gs.id, null::text, 'teacher'::text, (select name from public.teachers where id = gs.teacher_id),
      gs.starts_at - interval '10 minutes', gs.starts_at + make_interval(mins => gs.minutes) + interval '15 minutes';
    return;
  end if;
  if private.is_teacher(b.teacher_id) then
    who := 'teacher';
    select name into label from public.teachers where id = b.teacher_id;
  elsif private.owns_learner(b.learner_id) then
    who := 'family';
    select name into label from public.learners where id = b.learner_id;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if b.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  if now() < b.starts_at - interval '10 minutes' then raise exception 'room_not_open' using errcode = 'P0001'; end if;
  if now() > b.starts_at + make_interval(mins => b.minutes) + interval '15 minutes' then raise exception 'room_closed' using errcode = 'P0001'; end if;
  return query select coalesce(b.group_session_id, b.id), case when b.group_session_id is null then b.video_room end, who, label,
    b.starts_at - interval '10 minutes', b.starts_at + make_interval(mins => b.minutes) + interval '15 minutes';
end
$$;

-- Séquestre : pour un membre de groupe, l'heure enseignée est comptée une seule fois, à la séance de groupe.
create or replace function private.settle_escrow() returns int
language plpgsql set search_path = '' as $$
declare
  r record;
  n int := 0;
  hours int := (select escrow_hours from public.pricing_settings);
begin
  for r in
    select b.id, b.status, b.group_session_id from public.bookings b
    where b.status in ('delivered', 'missed') and b.delivered_at is not null
      and b.delivered_at + make_interval(hours => hours) <= now()
      and not exists (select 1 from public.ledger_entries l where l.booking_id = b.id)
    for update skip locked
  loop
    if r.status = 'delivered' then
      update public.bookings set status = 'validated' where id = r.id;
    end if;
    perform private.credit_teacher(r.id, r.status = 'delivered' and r.group_session_id is null);
    n := n + 1;
  end loop;
  return n;
end
$$;

-- Une séance de groupe ne s'annule pas individuellement.
create or replace function public.cancel_booking(p_booking uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  fam uuid;
  outcome text;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or not private.owns_learner(b.learner_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'scheduled' then raise exception 'not_cancellable' using errcode = 'P0001'; end if;
  if b.group_session_id is not null then raise exception 'group_session' using errcode = 'P0001'; end if;
  fam := private.family_of_learner(b.learner_id);
  outcome := case when b.starts_at - private.family_now(fam)
    >= make_interval(hours => (select free_cancel_hours from public.pricing_settings)) then 'free' else 'due' end;
  if outcome = 'free' then
    update public.bookings set status = case when b.kind = 'trial' then 'refunded' else 'cancelled' end where id = b.id;
    update public.subscriptions set sessions_remaining = sessions_remaining + 1 where id = b.subscription_id;
    update public.payments set status = case when provider = 'simulated' then 'refunded' else 'refund_due' end, updated_at = now()
      where booking_id = b.id and subscription_id is null;
  else
    update public.bookings set status = 'validated' where id = b.id;
    perform private.credit_teacher(b.id, false);
  end if;
  return outcome;
end
$$;

-- Paiement Bictorys : les parts de groupe -----------------------------------------------------

create or replace function public.bictorys_checkout_context(p_payment uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'amount', p.amount, 'currency', p.currency, 'method', p.method,
    'provider', p.provider, 'status', p.status, 'checkout_url', p.checkout_url,
    'booking_id', coalesce(p.booking_id, p.group_member_id),
    'booking_status', case when p.booking_id is not null then b.status
      when g.status = 'payment' and gm.status = 'joined' then 'pending_payment' end,
    'hold_until', coalesce(b.hold_until, g.payment_deadline),
    'full_name', (select pr.full_name from public.profiles pr where pr.id = f.owner_id)
  )
  from public.payments p
  join public.families f on f.id = p.family_id
  left join public.bookings b on b.id = p.booking_id
  left join public.group_members gm on gm.id = p.group_member_id
  left join public.groups g on g.id = gm.group_id
  where p.id = p_payment and f.owner_id = p_user
$$;

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
    if g.status <> 'payment' or gm.status <> 'joined' then
      -- Groupe annulé, démarré sans ce membre, ou membre parti : payé, mais à rembourser.
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

-- Expiration des créneaux non payés : ne concerne que les réservations (les parts de groupe suivent l'échéance du groupe).
create or replace function private.expire_payment_holds() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select p.id from public.bookings b join public.payments p on p.booking_id = b.id and p.status = 'pending'
    where b.status = 'pending_payment' and b.hold_until < now()
  loop
    perform public.bictorys_settle(r.id, 'failed');
    n := n + 1;
  end loop;
  return n;
end
$$;
