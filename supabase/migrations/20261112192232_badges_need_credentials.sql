-- Un badge « diplôme » ou « ijaza » vérifié exige au moins un justificatif de ce type déclaré :
-- le serveur ignore la case cochée sinon (l'écran de modération la désactive déjà).
create or replace function public.review_teacher_application(
  p_teacher text, p_approve boolean, p_note text default null,
  p_identity boolean default false, p_diploma boolean default false, p_ijaza boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_diploma boolean := exists (select 1 from public.teacher_credentials where teacher_id = p_teacher and kind = 'diploma');
  has_ijaza boolean := exists (select 1 from public.teacher_credentials where teacher_id = p_teacher and kind = 'ijaza');
begin
  if not private.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.teachers where id = p_teacher and status = 'submitted') then
    raise exception 'not_under_review' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.teachers set status = 'approved', published = true, reviewed_at = now(), review_note = nullif(trim(p_note), ''),
      identity_verified = p_identity, diploma_verified = p_diploma and has_diploma, ijaza_verified = p_ijaza and has_ijaza
    where id = p_teacher;
    update public.teacher_credentials set verified = true
     where teacher_id = p_teacher and ((kind = 'diploma' and p_diploma) or (kind = 'ijaza' and p_ijaza));
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'note_required' using errcode = '22023'; end if;
    update public.teachers set status = 'rejected', published = false, reviewed_at = now(), review_note = left(p_note, 2000) where id = p_teacher;
  end if;
end
$$;
