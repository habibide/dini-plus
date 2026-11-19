-- Taille vérifiée côté serveur : photo 5 Mo au plus (la vidéo est déjà limitée à 50 Mo par l'espace de stockage).
create or replace function public.set_teacher_media(p_kind text, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id text := private.my_teacher_id();
  v_mime text;
  v_size bigint;
begin
  if v_id is null then raise exception 'not_a_teacher'; end if;
  if p_kind not in ('photo', 'video') then raise exception 'invalid_media'; end if;
  if p_path is not null then
    if split_part(p_path, '/', 1) <> v_id or p_path like '%..%' then raise exception 'forbidden'; end if;
    select o.metadata->>'mimetype', (o.metadata->>'size')::bigint into v_mime, v_size
      from storage.objects o where o.bucket_id = 'teacher-media' and o.name = p_path;
    if v_mime is null then raise exception 'invalid_media'; end if;
    if (p_kind = 'photo' and v_mime not like 'image/%') or (p_kind = 'video' and v_mime not like 'video/%') then
      raise exception 'invalid_media';
    end if;
    if p_kind = 'photo' and coalesce(v_size, 0) > 5 * 1024 * 1024 then raise exception 'photo_too_big'; end if;
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
