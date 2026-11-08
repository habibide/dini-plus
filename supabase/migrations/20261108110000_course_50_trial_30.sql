-- Cours de 50 minutes ; essai de 30 minutes à moitié prix, un par élève et par enseignant.
-- Le tarif publié par l'enseignant devient celui d'un cours de 50 minutes.

alter table public.pricing_settings
  add column course_minutes int not null default 50 check (course_minutes between 15 and 120),
  add column trial_minutes int not null default 30 check (trial_minutes between 15 and 120);

comment on column public.teachers.rate_xof is 'Prix d''un cours de 50 minutes en FCFA (tarif local).';
comment on column public.teachers.rate_eur is 'Prix d''un cours de 50 minutes en euros (tarif international).';

-- Les tarifs saisis jusqu'ici valaient pour 30 minutes : on les convertit à taux horaire constant.
update public.teachers set
  rate_xof = round(rate_xof * 50 / 30 / 50) * 50,
  rate_eur = round(rate_eur * 50 / 30 / 0.5) * 0.5
where rate_xof is not null and rate_eur is not null;

-- Créneaux libres pour une durée donnée : départs toutes les 30 minutes, la séance entière dans une plage de disponibilité.
drop function public.free_slots(text, timestamptz, int);
create function public.free_slots(p_teacher text, p_from timestamptz, p_days int default 7, p_minutes int default null)
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
      where b.teacher_id = p_teacher and b.status = 'scheduled'
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(sl.at, sl.at + make_interval(mins => len.dur))
    )
  order by 1
$$;
grant execute on function public.free_slots(text, timestamptz, int, int) to anon, authenticated;

create function private.trial_used(p_learner uuid, p_teacher text) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.bookings
    where learner_id = p_learner and teacher_id = p_teacher and kind = 'trial' and status not in ('cancelled', 'refunded')
  )
$$;

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
    where learner_id = p_learner and teacher_id = p_teacher and sessions_remaining > 0
    order by renews_at limit 1;
  return jsonb_build_object(
    'currency', p.currency,
    'session', p.amount,
    'trial', private.round_money(p.amount * s.trial_discount, p.currency),
    'trialAvailable', not private.trial_used(p_learner, p_teacher),
    'minutes', jsonb_build_object('course', s.course_minutes, 'trial', s.trial_minutes),
    'plans', (select jsonb_agg(jsonb_build_object('id', pl.id, 'sessions', pl.sessions, 'total', pl.sessions * p.amount) order by pl.sessions) from public.plans pl),
    'credit', case when sub.id is null then null else jsonb_build_object('remaining', sub.sessions_remaining, 'of', sub.sessions_per_month) end,
    'payments', (select to_jsonb(c.payments) from public.countries c where c.code = fam.country)
  );
end
$$;

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
  b_id uuid;
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
      where learner_id = p_learner and teacher_id = p_teacher and sessions_remaining > 0
      order by renews_at limit 1 for update;
    if sub.id is null then raise exception 'no_credit' using errcode = 'P0001'; end if;
    update public.subscriptions set sessions_remaining = sessions_remaining - 1 where id = sub.id;
    b_sub := sub.id;
    b_amount := round(sub.price / sub.sessions_per_month, 2);
    b_currency := sub.currency;
  else
    select * into pl from public.plans where id = p_choice;
    if pl.id is null then raise exception 'invalid_choice' using errcode = '22023'; end if;
    insert into public.subscriptions (learner_id, teacher_id, plan_id, sessions_per_month, sessions_remaining, price, currency, renews_at)
    values (p_learner, p_teacher, pl.id, pl.sessions, pl.sessions - 1, pl.sessions * price.amount, price.currency, now() + interval '30 days')
    returning id into b_sub;
    charged := pl.sessions * price.amount;
  end if;

  if charged > 0 and not exists (
    select 1 from public.countries c where c.code = fam.country and coalesce(p_method, c.payments[1]) = any (c.payments)
  ) then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;

  begin
    insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, minutes, amount, currency)
    values (p_learner, p_teacher, b_sub, b_kind, p_subject, p_starts_at, b_minutes, b_amount, b_currency)
    returning id into b_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;

  if charged > 0 then
    -- Paiement simulé : remplacé par l'appel au prestataire (Stripe, Wave, Orange Money) dans une Edge Function.
    insert into public.payments (family_id, booking_id, subscription_id, amount, currency, method)
    values (p_family, b_id, case when b_kind = 'plan' then b_sub end, charged, b_currency,
      coalesce(p_method, (select c.payments[1] from public.countries c where c.code = fam.country)));
  end if;

  return jsonb_build_object('booking_id', b_id, 'charged', charged, 'currency', b_currency);
end
$$;

revoke execute on function private.trial_used(uuid, text) from public, anon, authenticated;
