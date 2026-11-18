-- Règles métier côté serveur : prix, créneaux, réservation, annulation, litige, séquestre.
-- Le client n'écrit jamais directement une séance, un forfait ou un paiement : il appelle ces fonctions,
-- qui recalculent tout (prix, disponibilité, droits) à partir de la base.

-- Aides privées (schéma non exposé par l'API) ---------------------------------

create function private.owns_family(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.families f where f.id = p_family and f.owner_id = (select auth.uid()))
$$;

create function private.owns_learner(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.learners l join public.families f on f.id = l.family_id
    where l.id = p_learner and f.owner_id = (select auth.uid())
  )
$$;

create function private.is_teacher(p_teacher text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teachers t where t.id = p_teacher and t.user_id = (select auth.uid()))
$$;

create function private.can_see_booking(p_booking uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking and (private.owns_learner(b.learner_id) or private.is_teacher(b.teacher_id))
  )
$$;

create function private.teacher_published(p_teacher text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teachers t where t.id = p_teacher and t.published)
$$;

create function private.round_money(p_amount numeric, p_currency text) returns numeric
language sql immutable set search_path = '' as $$
  select round(p_amount / s) * s
  from (select case p_currency when 'XOF' then 50 when 'GMD' then 5 else 0.5 end::numeric as s) x
$$;

/** Prix d'une séance de 30 min pour un pays de résidence, même calcul que sessionPrice() dans @dini/core. */
create function private.session_price(p_teacher text, p_country text, out amount numeric, out currency text)
language plpgsql stable set search_path = '' as $$
declare
  s public.pricing_settings;
  t public.teachers;
begin
  select * into s from public.pricing_settings;
  select * into t from public.teachers where id = p_teacher;
  select c.currency into currency from public.countries c where c.code = p_country;
  amount := private.round_money(case currency
    when 'XOF' then t.rate_xof
    when 'GMD' then t.rate_xof * s.xof_to_gmd
    when 'EUR' then t.rate_eur
    when 'USD' then t.rate_eur * s.eur_to_usd
    when 'CAD' then t.rate_eur * s.eur_to_cad
  end, currency);
end
$$;

create function private.to_eur(p_amount numeric, p_currency text) returns numeric
language sql stable set search_path = '' as $$
  select case p_currency
    when 'EUR' then p_amount
    when 'XOF' then p_amount / 655.957
    when 'GMD' then p_amount / s.xof_to_gmd / 655.957
    when 'USD' then p_amount / s.eur_to_usd
    when 'CAD' then p_amount / s.eur_to_cad
  end
  from public.pricing_settings s
$$;

/** Paliers du §6 : 30 % jusqu'à 20 h, 25 % jusqu'à 50 h, 20 % jusqu'à 200 h, 15 % au-delà. */
create function private.commission_rate(p_hours numeric) returns numeric
language sql immutable set search_path = '' as $$
  select case when p_hours < 20 then 0.30 when p_hours < 50 then 0.25 when p_hours < 200 then 0.20 else 0.15 end
$$;

/** Heure courante vue par une famille : décalée seulement pour les familles de démonstration. */
create function private.family_now(p_family uuid) returns timestamptz
language sql stable set search_path = '' as $$
  select now() + coalesce((select clock_offset from public.families where id = p_family), '0')
$$;

/** Inscrit au journal la somme acquise par l'enseignant pour une séance. Idempotent. */
create function private.credit_teacher(p_booking uuid, p_taught boolean) returns void
language plpgsql set search_path = '' as $$
declare
  b public.bookings;
  t public.teachers;
  eur numeric;
  rate numeric;
begin
  select * into b from public.bookings where id = p_booking;
  select * into t from public.teachers where id = b.teacher_id for update;
  eur := private.to_eur(b.amount, b.currency);
  rate := private.commission_rate(t.hours_taught);
  insert into public.ledger_entries (teacher_id, booking_id, gross, currency, gross_eur, commission_rate, net_eur)
  values (b.teacher_id, b.id, b.amount, b.currency, eur, rate, eur * (1 - rate))
  on conflict (booking_id) do nothing;
  if found and p_taught then
    update public.teachers set hours_taught = hours_taught + b.minutes / 60.0 where id = b.teacher_id;
  end if;
end
$$;

/** Libère le séquestre des séances effectuées et non contestées depuis 48 h. Lancée par pg_cron. */
create function private.settle_escrow() returns int
language plpgsql set search_path = '' as $$
declare
  r record;
  n int := 0;
  hours int := (select escrow_hours from public.pricing_settings);
begin
  for r in
    select b.id from public.bookings b
    join public.learners l on l.id = b.learner_id
    join public.families f on f.id = l.family_id
    where b.status = 'delivered' and b.delivered_at + make_interval(hours => hours) <= now() + f.clock_offset
    for update of b skip locked
  loop
    update public.bookings set status = 'validated' where id = r.id;
    perform private.credit_teacher(r.id, true);
    n := n + 1;
  end loop;
  return n;
end
$$;

create function private.family_of_learner(p_learner uuid) returns uuid
language sql stable set search_path = '' as $$
  select family_id from public.learners where id = p_learner
$$;

-- Fonctions exposées (RPC) -----------------------------------------------------

/** Créneaux libres de 30 min, en UTC, sur `p_days` jours du calendrier de l'enseignant. */
create function public.free_slots(p_teacher text, p_from timestamptz, p_days int default 7)
returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with t as (
    select timezone as tz from public.teachers where id = p_teacher and published
  ),
  days as (
    select ((p_from at time zone t.tz)::date + i) as d, t.tz
    from t, generate_series(0, least(greatest(p_days, 1), 35) - 1) i
  ),
  slots as (
    select ((days.d + make_interval(mins => m)) at time zone days.tz) as at
    from days
    join public.availability_rules r on r.teacher_id = p_teacher and r.weekday = extract(dow from days.d)::int
    cross join lateral generate_series(r.start_min, r.end_min - 30, 30) m
  )
  select distinct s.at from slots s
  where s.at >= p_from
    and s.at >= now() + make_interval(mins => (select booking_lead_minutes from public.pricing_settings))
    and not exists (
      select 1 from public.bookings b
      where b.teacher_id = p_teacher and b.status = 'scheduled'
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(s.at, s.at + interval '30 minutes')
    )
  order by 1
$$;

/** Prix d'une séance chez chaque enseignant publié, pour le pays de la famille. */
create function public.price_list(p_family uuid)
returns table (teacher_id text, amount numeric, currency text)
language plpgsql stable security definer set search_path = '' as $$
declare
  c text;
begin
  if not private.owns_family(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  select country into c from public.families where id = p_family;
  return query select t.id, p.amount, p.currency
    from public.teachers t, lateral private.session_price(t.id, c) p
    where t.published;
end
$$;

/** Devis pour la page de réservation : séance, essai, forfaits, crédit restant et moyens de paiement. */
create function public.quote(p_family uuid, p_teacher text, p_learner uuid) returns jsonb
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
    'plans', (select jsonb_agg(jsonb_build_object('id', pl.id, 'sessions', pl.sessions, 'total', pl.sessions * p.amount) order by pl.sessions) from public.plans pl),
    'credit', case when sub.id is null then null else jsonb_build_object('remaining', sub.sessions_remaining, 'of', sub.sessions_per_month) end,
    'payments', (select to_jsonb(c.payments) from public.countries c where c.code = fam.country)
  );
end
$$;

/**
 * Réserve une séance. `p_choice` vaut 'trial', 'credit' ou un identifiant de forfait.
 * Lève 'slot_taken' si le créneau n'est plus libre, y compris en cas de course entre deux familles.
 */
create function public.book_session(
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
  if not exists (select 1 from public.free_slots(p_teacher, p_starts_at, 1) x where x = p_starts_at) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;

  select * into s from public.pricing_settings;
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
    values (p_learner, p_teacher, pl.id, pl.sessions, pl.sessions - 1, pl.sessions * price.amount, price.currency, private.family_now(p_family) + interval '30 days')
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
    values (p_learner, p_teacher, b_sub, b_kind, p_subject, p_starts_at, 30, b_amount, b_currency)
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

/** Annule une séance à venir. Gratuit jusqu'à 24 h avant ; ensuite la séance reste due à l'enseignant. */
create function public.cancel_booking(p_booking uuid) returns text
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
    update public.payments set status = 'refunded' where booking_id = b.id and subscription_id is null;
  else
    update public.bookings set status = 'validated' where id = b.id;
    perform private.credit_teacher(b.id, false);
  end if;
  return outcome;
end
$$;

/** Signale un problème sur une séance effectuée, dans les 48 h : le séquestre reste bloqué. */
create function public.dispute_booking(p_booking uuid, p_reason text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or not private.owns_learner(b.learner_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'delivered' or b.delivered_at + make_interval(hours => (select escrow_hours from public.pricing_settings))
    <= private.family_now(private.family_of_learner(b.learner_id)) then
    raise exception 'dispute_window_closed' using errcode = 'P0001';
  end if;
  update public.bookings set status = 'disputed' where id = b.id;
  insert into public.disputes (booking_id, reason) values (b.id, left(coalesce(p_reason, ''), 2000));
end
$$;

-- Inscription : un profil par compte -----------------------------------------

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Séquestre : toutes les 10 minutes ------------------------------------------

create extension if not exists pg_cron;
select cron.schedule('dini-settle-escrow', '*/10 * * * *', 'select private.settle_escrow()');
