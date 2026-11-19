-- Paiement réel par Bictorys (page de paiement hébergée : Wave, Orange Money, carte).
-- Pour les pays branchés sur Bictorys, une réservation payante naît « en attente de paiement » :
-- le créneau est bloqué 30 minutes, puis la séance n'est confirmée qu'à la réception du webhook Bictorys.
-- Les autres pays gardent le paiement simulé.

alter table public.countries
  add column payment_provider text not null default 'simulated' check (payment_provider in ('simulated', 'bictorys'));
comment on column public.countries.payment_provider is 'Prestataire de paiement du pays : simulated (aucun encaissement) ou bictorys.';

-- Séances ----------------------------------------------------------------------------------

alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in
  ('pending_payment', 'scheduled', 'delivered', 'validated', 'disputed', 'cancelled', 'refunded', 'missed'));
alter table public.bookings add column hold_until timestamptz;
comment on column public.bookings.hold_until is 'Fin du blocage du créneau pendant le paiement (statut pending_payment).';

-- Un créneau en cours de paiement est occupé.
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  teacher_id with =,
  private.slot_range(starts_at, minutes) with &&
) where (status in ('scheduled', 'pending_payment'));
create index on public.bookings (hold_until) where status = 'pending_payment';

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
      where b.teacher_id = p_teacher and b.status in ('scheduled', 'pending_payment')
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(sl.at, sl.at + make_interval(mins => len.dur))
    )
  order by 1
$$;

-- Forfaits : inactifs tant que le paiement n'est pas confirmé ---------------------------------

alter table public.subscriptions add column active boolean not null default true;
comment on column public.subscriptions.active is 'Faux tant que le paiement du forfait n''est pas confirmé (ou s''il a échoué).';

-- Paiements --------------------------------------------------------------------------------

alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending', 'succeeded', 'failed', 'refund_due', 'refunded'));
alter table public.payments
  add column checkout_url text,
  add column paid_at timestamptz,
  add column provider_payload jsonb,
  add column updated_at timestamptz not null default now();
alter table public.payments alter column provider set default 'simulated';
create unique index payments_provider_ref on public.payments (provider, provider_ref) where provider_ref is not null;
comment on table public.payments is 'Encaissements. provider = simulated (aucun argent) ou bictorys. refund_due : payé mais à rembourser (séance annulée ou créneau perdu).';
-- Les colonnes techniques ne sont lisibles que par le serveur.
revoke select on public.payments from authenticated;
grant select (id, family_id, booking_id, subscription_id, amount, currency, method, provider, status, created_at, paid_at) on public.payments to authenticated;

-- Devis : le forfait en cours doit être payé ------------------------------------------------

create or replace function public.quote(p_family uuid, p_teacher text, p_learner uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fam public.families;
  p record;
  s public.pricing_settings;
  sub public.subscriptions;
begin
  select * into fam from public.families where id = p_family and owner_id = (select auth.uid());
  if fam.id is null or private.family_of_learner(p_learner) is distinct from p_family then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into s from public.pricing_settings;
  select * into p from private.session_price(p_teacher, fam.country);
  select * into sub from public.subscriptions
    where learner_id = p_learner and teacher_id = p_teacher and sessions_remaining > 0 and active
    order by renews_at limit 1;
  return jsonb_build_object(
    'currency', p.currency,
    'session', p.amount,
    'trial', private.round_money(p.amount * s.trial_discount, p.currency),
    'trialAvailable', not private.trial_used(p_learner, p_teacher),
    'minutes', jsonb_build_object('course', s.course_minutes, 'trial', s.trial_minutes),
    'plans', (select jsonb_agg(jsonb_build_object('id', pl.id, 'sessions', pl.sessions, 'total', pl.sessions * p.amount) order by pl.sessions) from public.plans pl),
    'credit', case when sub.id is null then null else jsonb_build_object('remaining', sub.sessions_remaining, 'of', sub.sessions_per_month) end,
    'payments', (select to_jsonb(c.payments) from public.countries c where c.code = fam.country),
    'provider', (select c.payment_provider from public.countries c where c.code = fam.country)
  );
end
$$;

-- Réservation ------------------------------------------------------------------------------

create or replace function public.book_session(
  p_family uuid, p_learner uuid, p_teacher text, p_subject text, p_starts_at timestamptz, p_choice text, p_method text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  fam public.families;
  price record;
  s public.pricing_settings;
  sub public.subscriptions;
  pl public.plans;
  provider text;
  pay_now boolean;
  b_id uuid;
  p_id uuid;
  b_kind text := 'plan';
  b_minutes int;
  b_amount numeric;
  b_currency text;
  b_sub uuid;
  charged numeric := 0;
begin
  select * into fam from public.families where id = p_family and owner_id = (select auth.uid());
  if fam.id is null or private.family_of_learner(p_learner) is distinct from p_family then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.teachers where id = p_teacher and published and p_subject = any (subjects)) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;

  select * into s from public.pricing_settings;
  select c.payment_provider into provider from public.countries c where c.code = fam.country;
  b_minutes := case when p_choice = 'trial' then s.trial_minutes else s.course_minutes end;
  if p_choice = 'trial' and private.trial_used(p_learner, p_teacher) then
    raise exception 'trial_already_used' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.free_slots(p_teacher, p_starts_at, 1, b_minutes) x where x = p_starts_at) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;

  select * into price from private.session_price(p_teacher, fam.country);
  b_currency := price.currency;
  b_amount := price.amount;

  if p_choice = 'trial' then
    b_kind := 'trial';
    b_amount := private.round_money(price.amount * s.trial_discount, price.currency);
    charged := b_amount;
  elsif p_choice = 'credit' then
    select * into sub from public.subscriptions
      where learner_id = p_learner and teacher_id = p_teacher and sessions_remaining > 0 and active
      order by renews_at limit 1 for update;
    if sub.id is null then raise exception 'no_credit' using errcode = 'P0001'; end if;
    update public.subscriptions set sessions_remaining = sessions_remaining - 1 where id = sub.id;
    b_sub := sub.id;
    b_amount := round(sub.price / sub.sessions_per_month, 2);
    b_currency := sub.currency;
  else
    select * into pl from public.plans where id = p_choice;
    if pl.id is null then raise exception 'invalid_choice' using errcode = '22023'; end if;
    charged := pl.sessions * price.amount;
  end if;

  pay_now := charged > 0 and provider = 'bictorys';

  if charged > 0 and not exists (
    select 1 from public.countries c where c.code = fam.country and coalesce(p_method, c.payments[1]) = any (c.payments)
  ) then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;

  if b_kind = 'plan' and p_choice <> 'credit' then
    insert into public.subscriptions (learner_id, teacher_id, plan_id, sessions_per_month, sessions_remaining, price, currency, renews_at, active)
    values (p_learner, p_teacher, pl.id, pl.sessions, pl.sessions - 1, pl.sessions * price.amount, price.currency, now() + interval '30 days', not pay_now)
    returning id into b_sub;
  end if;

  begin
    insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, minutes, amount, currency, status, hold_until)
    values (p_learner, p_teacher, b_sub, b_kind, p_subject, p_starts_at, b_minutes, b_amount, b_currency,
      case when pay_now then 'pending_payment' else 'scheduled' end,
      case when pay_now then now() + interval '30 minutes' end)
    returning id into b_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;

  if charged > 0 then
    insert into public.payments (family_id, booking_id, subscription_id, amount, currency, method, provider, status)
    values (p_family, b_id, case when b_kind = 'plan' then b_sub end, charged, b_currency,
      coalesce(p_method, (select c.payments[1] from public.countries c where c.code = fam.country)),
      case when pay_now then 'bictorys' else 'simulated' end,
      case when pay_now then 'pending' else 'succeeded' end)
    returning id into p_id;
  end if;

  return jsonb_build_object('booking_id', b_id, 'charged', charged, 'currency', b_currency,
    'payment_id', p_id, 'needs_payment', pay_now);
end
$$;

-- Issue d'un paiement Bictorys ---------------------------------------------------------------

/**
 * Applique le résultat d'un paiement Bictorys (appelé par le webhook, ou par l'expiration du blocage).
 * Réussi : séance confirmée et forfait activé. Si le créneau a été repris entre-temps, la séance est
 * annulée et le paiement passe « à rembourser ». Échoué ou expiré : séance annulée, créneau libéré.
 */
create function public.bictorys_settle(
  p_payment uuid, p_status text, p_amount numeric default null, p_currency text default null,
  p_ref text default null, p_payload jsonb default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  b public.bookings;
begin
  select * into pay from public.payments where id = p_payment and provider = 'bictorys' for update;
  if pay.id is null then return 'unknown_payment'; end if;
  if pay.status in ('succeeded', 'refund_due', 'refunded') then return 'already_settled'; end if;
  select * into b from public.bookings where id = pay.booking_id for update;

  update public.payments set provider_payload = coalesce(p_payload, provider_payload),
    provider_ref = coalesce(provider_ref, p_ref), updated_at = now() where id = pay.id;

  if p_status = 'succeeded' then
    if p_amount is null or p_amount < pay.amount or upper(coalesce(p_currency, '')) <> pay.currency then
      -- Montant ou devise inattendus : on n'active rien, à vérifier à la main.
      update public.payments set status = 'refund_due', paid_at = now() where id = pay.id;
      if b.status = 'pending_payment' then
        update public.bookings set status = 'cancelled', hold_until = null where id = b.id;
      end if;
      return 'amount_mismatch';
    end if;

    update public.payments set status = 'succeeded', paid_at = now() where id = pay.id;
    if b.id is null or b.status not in ('pending_payment', 'cancelled') then return 'paid'; end if;
    begin
      -- Paiement arrivé après l'expiration du blocage : on reprend le créneau s'il est encore libre.
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
revoke execute on function public.bictorys_settle(uuid, text, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.bictorys_settle(uuid, text, numeric, text, text, jsonb) to service_role;

/** Libère les créneaux dont le paiement n'a pas abouti à temps. */
create function private.expire_payment_holds() returns int
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
revoke execute on function private.expire_payment_holds() from public, anon, authenticated;
select cron.schedule('dini-expire-payment-holds', '*/5 * * * *', 'select private.expire_payment_holds()');

-- Annulation : un paiement Bictorys n'est pas remboursé automatiquement --------------------------

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
