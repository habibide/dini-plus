-- Correctif : `text[] || 'littéral'` était lu comme une concaténation de deux tableaux.
/** Envoie la candidature aux modérateurs, après contrôle des champs obligatoires. */
create or replace function public.submit_teacher_application() returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  missing text[] := '{}';
begin
  if t.status not in ('draft', 'rejected') then raise exception 'not_submittable' using errcode = 'P0001'; end if;
  if length(trim(t.name)) < 3 then missing := array_append(missing, 'nom'); end if;
  if t.gender is null then missing := array_append(missing, 'genre'); end if;
  if length(trim(t.city)) = 0 then missing := array_append(missing, 'ville'); end if;
  if length(trim(t.headline)) < 10 then missing := array_append(missing, 'titre'); end if;
  if length(trim(t.bio)) < 80 then missing := array_append(missing, 'présentation'); end if;
  if cardinality(t.subjects) = 0 then missing := array_append(missing, 'matières'); end if;
  if cardinality(t.languages) = 0 then missing := array_append(missing, 'langues'); end if;
  if t.rate_xof is null or t.rate_eur is null then missing := array_append(missing, 'tarifs'); end if;
  if not exists (select 1 from public.teacher_credentials where teacher_id = t.id) then missing := array_append(missing, 'diplôme ou ijaza'); end if;
  if not exists (select 1 from public.availability_rules where teacher_id = t.id) then missing := array_append(missing, 'disponibilités'); end if;
  if cardinality(missing) > 0 then
    raise exception 'incomplete_application' using errcode = 'P0001', detail = array_to_string(missing, ', ');
  end if;
  update public.teachers set status = 'submitted', submitted_at = now(), review_note = null where id = t.id;
end
$$;

