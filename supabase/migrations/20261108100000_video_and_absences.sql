-- Visioconférence et règle des absences.

-- 1. Salle vidéo Daily, créée à la première entrée par la fonction serveur join-session.
alter table public.bookings add column video_room text;
comment on column public.bookings.video_room is 'Nom de la salle Daily de la séance. Écrit uniquement par la fonction join-session.';

/**
 * Contrôle d'accès à la salle : renvoie la séance et le rôle de l'appelant (teacher ou family), ou lève une erreur.
 * La salle ouvre 10 minutes avant le début et ferme 15 minutes après la fin prévue.
 */
create function public.video_access(p_booking uuid)
returns table (booking_id uuid, room text, role text, display_name text, opens_at timestamptz, closes_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.bookings;
  who text;
  label text;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
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
  return query select b.id, b.video_room, who, label,
    b.starts_at - interval '10 minutes', b.starts_at + make_interval(mins => b.minutes) + interval '15 minutes';
end
$$;
revoke execute on function public.video_access(uuid) from public, anon;
grant execute on function public.video_access(uuid) to authenticated;

-- 2. Absence de l'élève : la séance est due à l'enseignant, sauf contestation de la famille sous 48 h.
-- delivered_at sert de point de départ du délai, comme pour une séance effectuée.
create or replace function public.mark_session_missed(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking and teacher_id = t.id for update;
  if b.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  if b.starts_at + interval '10 minutes' > now() then raise exception 'too_early' using errcode = 'P0001'; end if;
  update public.bookings set status = 'missed', delivered_at = now() where id = b.id;
end
$$;

create or replace function private.settle_escrow() returns int
language plpgsql set search_path = '' as $$
declare
  r record;
  n int := 0;
  hours int := (select escrow_hours from public.pricing_settings);
begin
  for r in
    select b.id, b.status from public.bookings b
    where b.status in ('delivered', 'missed') and b.delivered_at is not null
      and b.delivered_at + make_interval(hours => hours) <= now()
      and not exists (select 1 from public.ledger_entries l where l.booking_id = b.id)
    for update skip locked
  loop
    if r.status = 'delivered' then
      update public.bookings set status = 'validated' where id = r.id;
    end if;
    -- Une absence reste « missed » pour l'assiduité ; elle est payée sans compter d'heure enseignée.
    perform private.credit_teacher(r.id, r.status = 'delivered');
    n := n + 1;
  end loop;
  return n;
end
$$;

create or replace function public.dispute_booking(p_booking uuid, p_reason text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or not private.owns_learner(b.learner_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status not in ('delivered', 'missed') or b.delivered_at is null
    or b.delivered_at + make_interval(hours => (select escrow_hours from public.pricing_settings)) <= now()
    or exists (select 1 from public.ledger_entries l where l.booking_id = b.id) then
    raise exception 'dispute_window_closed' using errcode = 'P0001';
  end if;
  update public.bookings set status = 'disputed' where id = b.id;
  insert into public.disputes (booking_id, reason) values (b.id, left(coalesce(p_reason, ''), 2000));
end
$$;
