-- Candidature simplifiée (un entretien suit l'envoi) :
--  * diplômes et ijaza facultatifs, ajoutables après l'approbation pour mettre son profil en avant ;
--  * chaque diplôme porte sa propre vérification : un ajout après approbation reste « déclaré » ;
--  * le tarif international (€) se déduit du tarif local (FCFA), au demi-euro près.

alter table public.teacher_credentials add column verified boolean not null default false;

update public.teacher_credentials c set verified = true
  from public.teachers t
 where t.id = c.teacher_id
   and ((c.kind = 'ijaza' and t.ijaza_verified) or (c.kind = 'diploma' and t.diploma_verified));

create or replace function private.eur_from_xof(p_xof numeric) returns numeric
language sql immutable set search_path = '' as $$
  select greatest(0.5, round(p_xof / 655.957 * 2) / 2)
$$;

update public.teachers set rate_eur = private.eur_from_xof(rate_xof) where rate_xof is not null;

create or replace function public.save_teacher_application(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.teachers := private.my_teacher();
  c jsonb;
  i int;
  xof numeric := (p -> 'rates' ->> 'XOF')::numeric;
begin
  if t.status = 'submitted' then raise exception 'application_under_review' using errcode = 'P0001'; end if;
  if t.status = 'approved' and (
    (p ? 'name' and left(p ->> 'name', 120) is distinct from t.name) or (p ? 'gender' and p ->> 'gender' is distinct from t.gender)
  ) then
    raise exception 'identity_locked' using errcode = 'P0001';
  end if;
  if xof is not null and xof <= 0 then raise exception 'invalid_rate' using errcode = '22023'; end if;
  update public.teachers set
    name = coalesce(left(p ->> 'name', 120), name),
    gender = coalesce(p ->> 'gender', gender),
    city = coalesce(left(p ->> 'city', 80), city),
    country_label = coalesce(left(p ->> 'countryLabel', 80), country_label),
    timezone = coalesce(p ->> 'timezone', timezone),
    headline = coalesce(left(p ->> 'headline', 160), headline),
    bio = coalesce(left(p ->> 'bio', 3000), bio),
    subjects = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'subjects') x), subjects),
    arabic_tracks = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'arabicTracks') x), arabic_tracks),
    languages = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'languages') x), languages),
    riwayat = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'riwayat') x), riwayat),
    madhahib = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'madhahib') x), madhahib),
    levels = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'levels') x), levels),
    age_groups = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'ageGroups') x), age_groups),
    rate_xof = coalesce(xof, rate_xof),
    rate_eur = coalesce(private.eur_from_xof(xof), rate_eur)
  where id = t.id;

  -- Les diplômes déjà vérifiés ne bougent plus ; la liste envoyée remplace les seuls diplômes déclarés.
  if p ? 'credentials' then
    delete from public.teacher_credentials where teacher_id = t.id and not verified;
    select coalesce(max(position) + 1, 0) into i from public.teacher_credentials where teacher_id = t.id;
    for c in select * from jsonb_array_elements(p -> 'credentials') loop
      continue when coalesce(trim(c ->> 'title'), '') = '';
      insert into public.teacher_credentials (teacher_id, kind, title, institution, year, riwaya, sanad, position)
      values (t.id, c ->> 'kind', left(c ->> 'title', 160), coalesce(left(c ->> 'institution', 160), ''), (c ->> 'year')::int, c ->> 'riwaya',
        (select array_agg(left(x, 120)) from jsonb_array_elements_text(c -> 'sanad') x), i);
      i := i + 1;
    end loop;
  end if;
end
$$;

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
  if length(trim(t.headline)) < 10 then missing := array_append(missing, 'titre'); end if;
  if length(trim(t.bio)) < 80 then missing := array_append(missing, 'présentation'); end if;
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

create or replace function public.review_teacher_application(
  p_teacher text, p_approve boolean, p_note text default null,
  p_identity boolean default false, p_diploma boolean default false, p_ijaza boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.teachers where id = p_teacher and status = 'submitted') then
    raise exception 'not_under_review' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.teachers set status = 'approved', published = true, reviewed_at = now(), review_note = nullif(trim(p_note), ''),
      identity_verified = p_identity, diploma_verified = p_diploma, ijaza_verified = p_ijaza
    where id = p_teacher;
    update public.teacher_credentials set verified = true
     where teacher_id = p_teacher and ((kind = 'diploma' and p_diploma) or (kind = 'ijaza' and p_ijaza));
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'note_required' using errcode = '22023'; end if;
    update public.teachers set status = 'rejected', published = false, reviewed_at = now(), review_note = left(p_note, 2000) where id = p_teacher;
  end if;
end
$$;
