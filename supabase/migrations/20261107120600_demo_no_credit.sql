-- Les séances des familles de démonstration ne créditent jamais les enseignants :
-- sinon un visiteur anonyme pourrait, avec demo_deliver puis demo_advance, gonfler les heures
-- (donc la commission et le badge « confirmé ») d'enseignants partagés par tous.
create or replace function private.credit_teacher(p_booking uuid, p_taught boolean) returns void
language plpgsql set search_path = '' as $$
declare
  b public.bookings;
  t public.teachers;
  eur numeric;
  rate numeric;
begin
  select * into b from public.bookings where id = p_booking;
  if exists (
    select 1 from public.learners l join public.families f on f.id = l.family_id
    where l.id = b.learner_id and f.demo_template is not null
  ) then
    return;
  end if;
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
revoke execute on function private.credit_teacher(uuid, boolean) from public, anon, authenticated;
