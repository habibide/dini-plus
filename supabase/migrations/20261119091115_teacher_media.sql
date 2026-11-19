-- Photo de profil et vidéo de présentation des professeurs.
-- Fichiers dans un espace public (comme les profils publiés), un dossier par professeur.

alter table public.teachers
  add column if not exists photo_path text,
  add column if not exists video_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-media', 'teacher-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Dossier du professeur connecté : son identifiant de professeur.
create or replace function private.my_teacher_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.teachers where user_id = (select auth.uid()) limit 1
$$;
revoke all on function private.my_teacher_id() from public, anon;
grant execute on function private.my_teacher_id() to authenticated;

-- Chaque professeur n'écrit que dans son propre dossier (teacher-media/<id professeur>/…).
create policy "media professeur (ajout)" on storage.objects for insert to authenticated
  with check (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = (select private.my_teacher_id()));
create policy "media professeur (remplacement)" on storage.objects for update to authenticated
  using (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = (select private.my_teacher_id()))
  with check (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = (select private.my_teacher_id()));
create policy "media professeur (suppression)" on storage.objects for delete to authenticated
  using (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = (select private.my_teacher_id()));

-- Enregistre (ou retire, avec null) la photo ou la vidéo du professeur connecté.
-- Le fichier doit être dans son dossier et avoir le bon type.
create or replace function public.set_teacher_media(p_kind text, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id text := private.my_teacher_id();
  v_mime text;
begin
  if v_id is null then raise exception 'not_a_teacher'; end if;
  if p_kind not in ('photo', 'video') then raise exception 'invalid_media'; end if;
  if p_path is not null then
    if split_part(p_path, '/', 1) <> v_id or p_path like '%..%' then raise exception 'forbidden'; end if;
    select o.metadata->>'mimetype' into v_mime from storage.objects o where o.bucket_id = 'teacher-media' and o.name = p_path;
    if v_mime is null then raise exception 'invalid_media'; end if;
    if (p_kind = 'photo' and v_mime not like 'image/%') or (p_kind = 'video' and v_mime not like 'video/%') then
      raise exception 'invalid_media';
    end if;
  end if;
  if p_kind = 'photo' then
    update public.teachers set photo_path = p_path where id = v_id;
  else
    update public.teachers set video_path = p_path where id = v_id;
  end if;
end;
$$;
revoke all on function public.set_teacher_media(text, text) from public, anon;
grant execute on function public.set_teacher_media(text, text) to authenticated;
