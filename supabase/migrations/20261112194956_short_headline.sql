-- Titre de profil : 3 caractères suffisent (« Coran »), et le message dit le minimum attendu.
create or replace function public.submit_teacher_application()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.teachers := private.my_teacher();
  missing text[] := '{}';
begin
  if t.status not in ('draft', 'rejected') then raise exception 'not_submittable' using errcode = 'P0001'; end if;
  if length(trim(t.name)) < 3 then missing := array_append(missing, 'nom'); end if;
  if t.gender is null then missing := array_append(missing, 'genre'); end if;
  if length(trim(t.city)) = 0 then missing := array_append(missing, 'ville'); end if;
  if length(trim(t.headline)) < 3 then missing := array_append(missing, 'titre (3 caractères au moins)'); end if;
  if length(trim(t.bio)) < 80 then missing := array_append(missing, 'présentation (80 caractères au moins)'); end if;
  if cardinality(t.subjects) = 0 then missing := array_append(missing, 'matières'); end if;
  if cardinality(t.languages) = 0 then missing := array_append(missing, 'langues'); end if;
  if t.rate_xof is null then missing := array_append(missing, 'tarif'); end if;
  if not exists (select 1 from public.availability_rules where teacher_id = t.id) then missing := array_append(missing, 'disponibilités'); end if;
  if cardinality(missing) > 0 then
    raise exception 'incomplete_application' using errcode = 'P0001', detail = array_to_string(missing, ', ');
  end if;
  update public.teachers set status = 'submitted', submitted_at = now(), review_note = null where id = t.id;
end
$$;
