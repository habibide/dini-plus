-- Vérification des diplômes et ijaza ajoutés par un enseignant déjà approuvé.
-- Le modérateur valide (le diplôme passe « Vérifié par DINE » et le badge correspondant s'allume)
-- ou refuse (le diplôme est retiré du profil).

create or replace function public.credentials_to_review()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'teacherId', t.id, 'teacherName', t.name, 'kind', c.kind, 'title', c.title,
      'institution', c.institution, 'year', c.year, 'riwaya', c.riwaya
    ) order by t.name, c.position)
    from public.teacher_credentials c join public.teachers t on t.id = c.teacher_id
    where t.status = 'approved' and not c.verified
  ), '[]'::jsonb);
end
$$;

create or replace function public.review_credential(p_id bigint, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.teacher_credentials;
begin
  if not private.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.teacher_credentials where id = p_id and not verified;
  if not found then raise exception 'credential_not_pending' using errcode = 'P0001'; end if;
  if p_approve then
    update public.teacher_credentials set verified = true where id = p_id;
    update public.teachers set
      diploma_verified = diploma_verified or c.kind = 'diploma',
      ijaza_verified = ijaza_verified or c.kind = 'ijaza'
    where id = c.teacher_id;
  else
    delete from public.teacher_credentials where id = p_id;
  end if;
end
$$;

revoke all on function public.credentials_to_review() from public, anon;
revoke all on function public.review_credential(bigint, boolean) from public, anon;
grant execute on function public.credentials_to_review() to authenticated;
grant execute on function public.review_credential(bigint, boolean) to authenticated;
