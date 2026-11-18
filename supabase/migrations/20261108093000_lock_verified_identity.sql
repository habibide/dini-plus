-- Après approbation, le nom et le genre ont été vérifiés par un modérateur : ils ne se modifient plus ici.
create or replace function public.save_teacher_application(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  c jsonb;
  i int := 0;
begin
  if t.status = 'submitted' then raise exception 'application_under_review' using errcode = 'P0001'; end if;
  if t.status = 'approved' and (
    (p ? 'name' and left(p ->> 'name', 120) is distinct from t.name) or (p ? 'gender' and p ->> 'gender' is distinct from t.gender)
  ) then
    raise exception 'identity_locked' using errcode = 'P0001';
  end if;
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
    rate_xof = coalesce((p -> 'rates' ->> 'XOF')::numeric, rate_xof),
    rate_eur = coalesce((p -> 'rates' ->> 'EUR')::numeric, rate_eur)
  where id = t.id;

  if p ? 'credentials' then
    if t.status = 'approved' then raise exception 'credentials_locked' using errcode = 'P0001'; end if;
    delete from public.teacher_credentials where teacher_id = t.id;
    for c in select * from jsonb_array_elements(p -> 'credentials') loop
      insert into public.teacher_credentials (teacher_id, kind, title, institution, year, riwaya, sanad, position)
      values (t.id, c ->> 'kind', left(c ->> 'title', 160), left(c ->> 'institution', 160), (c ->> 'year')::int, c ->> 'riwaya',
        (select array_agg(left(x, 120)) from jsonb_array_elements_text(c -> 'sanad') x), i);
      i := i + 1;
    end loop;
  end if;
end
$$;
