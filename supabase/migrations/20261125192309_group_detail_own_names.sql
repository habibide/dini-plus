-- Page du groupe : nom complet pour ses propres enfants (prénom seul pour les autres familles).
/** Détail d'un groupe pour ses membres, son organisateur et son professeur. */
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
