-- Les séances de démonstration n'occupent pas les vrais agendas : sans cela, chaque visiteur anonyme
-- réserverait de vrais créneaux (2 ou 3 à l'arrivée, puis autant qu'il veut) et pourrait remplir l'agenda des enseignants.
-- Une séance de démo ne bloque que la famille de démo qui l'a prise.

alter table public.bookings add column is_demo boolean not null default false;
comment on column public.bookings.is_demo is 'Séance d''une famille de démonstration : invisible pour les agendas des autres familles.';

update public.bookings b set is_demo = true
from public.learners l join public.families f on f.id = l.family_id
where l.id = b.learner_id and f.demo_template is not null;

create function private.set_booking_demo() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.is_demo := exists (
    select 1 from public.learners l join public.families f on f.id = l.family_id
    where l.id = new.learner_id and f.demo_template is not null
  );
  return new;
end
$$;
revoke execute on function private.set_booking_demo() from public, anon, authenticated;

create trigger bookings_set_demo before insert on public.bookings
  for each row execute function private.set_booking_demo();

alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  teacher_id with =,
  private.slot_range(starts_at, minutes) with &&
) where (status = 'scheduled' and not is_demo);

create or replace function public.free_slots(p_teacher text, p_from timestamptz, p_days int default 7)
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
        and (not b.is_demo or private.owns_learner(b.learner_id))
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(s.at, s.at + interval '30 minutes')
    )
  order by 1
$$;
