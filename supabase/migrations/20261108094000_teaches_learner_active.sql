-- Un enseignant ne voit un élève qu'au titre d'une séance prévue ou tenue : pas après une annulation ou un remboursement.
create or replace function private.teaches_learner(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b join public.teachers t on t.id = b.teacher_id
    where b.learner_id = p_learner and t.user_id = (select auth.uid())
      and b.status in ('scheduled', 'delivered', 'validated', 'disputed', 'missed')
  )
$$;
