-- Identifiant du profil enseignant du compte connecté (teachers.user_id n'est pas lisible côté client).
create function public.my_teacher_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.teachers where user_id = (select auth.uid())
$$;
revoke execute on function public.my_teacher_id() from public, anon;
grant execute on function public.my_teacher_id() to authenticated;
