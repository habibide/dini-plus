-- Justificatifs des professeurs (scans de diplômes, d'ijaza…) : privés, lus seulement par le professeur
-- et par les modérateurs, qui s'en servent pour vérifier les diplômes déclarés.
-- Rattachés au professeur (et non à une ligne de diplôme, recréée à chaque enregistrement du dossier).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-documents', 'teacher-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.teacher_documents (
  id bigint generated always as identity primary key,
  teacher_id text not null references public.teachers (id) on delete cascade,
  path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 200),
  content_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);
create index on public.teacher_documents (teacher_id);
comment on table public.teacher_documents is 'Justificatifs privés des professeurs (diplômes, ijaza), pour la vérification par les modérateurs.';

alter table public.teacher_documents enable row level security;
grant select on public.teacher_documents to authenticated;
create policy "mes justificatifs ou modération (lecture)" on public.teacher_documents for select to authenticated
  using (teacher_id = (select private.my_teacher_id()) or (select private.is_moderator()));

-- Fichiers : le professeur écrit et supprime dans son dossier ; lui et les modérateurs peuvent les lire.
create policy "justificatif professeur (ajout)" on storage.objects for insert to authenticated
  with check (bucket_id = 'teacher-documents' and (storage.foldername(name))[1] = (select private.my_teacher_id()));
create policy "justificatif professeur (suppression)" on storage.objects for delete to authenticated
  using (bucket_id = 'teacher-documents' and (storage.foldername(name))[1] = (select private.my_teacher_id()));
create policy "justificatif professeur ou modération (lecture)" on storage.objects for select to authenticated
  using (bucket_id = 'teacher-documents'
    and ((storage.foldername(name))[1] = (select private.my_teacher_id()) or (select private.is_moderator())));

/** Enregistre un justificatif déjà envoyé dans le dossier du professeur connecté (10 au plus, 10 Mo chacun). */
create function public.add_teacher_document(p_path text, p_file_name text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id text := private.my_teacher_id();
  v_mime text;
  v_size bigint;
  v_doc bigint;
begin
  if v_id is null then raise exception 'not_a_teacher'; end if;
  if split_part(p_path, '/', 1) <> v_id or p_path like '%..%' then raise exception 'forbidden' using errcode = '42501'; end if;
  if (select count(*) from public.teacher_documents where teacher_id = v_id) >= 10 then raise exception 'too_many_documents'; end if;
  select o.metadata->>'mimetype', (o.metadata->>'size')::bigint into v_mime, v_size
    from storage.objects o where o.bucket_id = 'teacher-documents' and o.name = p_path;
  if v_mime is null or v_size is null or v_mime not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'invalid_document';
  end if;
  if v_size > 10 * 1024 * 1024 then raise exception 'document_too_big'; end if;
  insert into public.teacher_documents (teacher_id, path, file_name, content_type, size)
  values (v_id, p_path, left(coalesce(nullif(trim(p_file_name), ''), 'document'), 200), v_mime, v_size)
  returning id into v_doc;
  return v_doc;
end
$$;

/** Retire un justificatif du professeur connecté ; renvoie le chemin du fichier à supprimer. */
create function public.remove_teacher_document(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_path text;
begin
  delete from public.teacher_documents where id = p_id and teacher_id = private.my_teacher_id() returning path into v_path;
  if v_path is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return v_path;
end
$$;

revoke all on function public.add_teacher_document(text, text) from public, anon;
revoke all on function public.remove_teacher_document(bigint) from public, anon;
grant execute on function public.add_teacher_document(text, text) to authenticated;
grant execute on function public.remove_teacher_document(bigint) to authenticated;
