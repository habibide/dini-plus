-- Plus de réservation payante sans encaissement réel : dans un pays encore en paiement simulé,
-- seules les séances prises sur le crédit d'un forfait déjà payé restent possibles.
-- (Sinon, déclarer un pays « simulé » suffisait à réserver gratuitement.)

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
  -- Pas d'encaissement réel dans ce pays : pas de réservation payante (le crédit d'un forfait reste utilisable).
  if charged > 0 and not pay_now then
    raise exception 'payment_not_available' using errcode = 'P0001';
  end if;

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
