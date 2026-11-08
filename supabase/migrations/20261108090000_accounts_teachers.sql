-- Vrais comptes (plus de mode démo), candidature enseignant avec validation, espace enseignant.

-- 1. Retrait du mode démo -------------------------------------------------------

drop function public.ensure_demo_family(text);
drop function public.reset_demo(uuid);
drop function public.demo_deliver(uuid, jsonb);
drop function public.demo_advance(uuid, int);
drop function private.demo_family(uuid);
drop function private.clone_demo(text, uuid);

delete from public.families where demo_template is not null;
delete from auth.users where is_anonymous;

drop trigger bookings_set_demo on public.bookings;
drop function private.set_booking_demo();
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings drop column is_demo;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  teacher_id with =,
  private.slot_range(starts_at, minutes) with &&
) where (status = 'scheduled');

alter table public.families drop column demo_template;
alter table public.families drop column clock_offset;
alter table public.families add constraint families_owner_unique unique (owner_id);

/** Heure métier. Un seul point d'entrée, pour pouvoir la figer dans les tests. */
create or replace function private.family_now(p_family uuid) returns timestamptz
language sql stable set search_path = '' as $$ select now() $$;

create or replace function private.settle_escrow() returns int
language plpgsql set search_path = '' as $$
declare
  r record;
  n int := 0;
  hours int := (select escrow_hours from public.pricing_settings);
begin
  for r in
    select b.id from public.bookings b
    where b.status = 'delivered' and b.delivered_at + make_interval(hours => hours) <= now()
    for update skip locked
  loop
    update public.bookings set status = 'validated' where id = r.id;
    perform private.credit_teacher(r.id, true);
    n := n + 1;
  end loop;
  return n;
end
$$;

create or replace function private.credit_teacher(p_booking uuid, p_taught boolean) returns void
language plpgsql set search_path = '' as $$
declare
  b public.bookings;
  t public.teachers;
  eur numeric;
  rate numeric;
begin
  select * into b from public.bookings where id = p_booking;
  select * into t from public.teachers where id = b.teacher_id for update;
  eur := private.to_eur(b.amount, b.currency);
  rate := private.commission_rate(t.hours_taught);
  insert into public.ledger_entries (teacher_id, booking_id, gross, currency, gross_eur, commission_rate, net_eur)
  values (b.teacher_id, b.id, b.amount, b.currency, eur, rate, eur * (1 - rate))
  on conflict (booking_id) do nothing;
  if found and p_taught then
    update public.teachers set hours_taught = hours_taught + b.minutes / 60.0 where id = b.teacher_id;
  end if;
end
$$;

create or replace function public.free_slots(p_teacher text, p_from timestamptz, p_days int default 7)
returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with t as (
    select timezone as tz from public.teachers where id = p_teacher and published
  ),
  days as (
    select ((p_from at time zone t.tz)::date + i) as d, t.tz
    from t, generate_series(0, least(greatest(p_days, 1), 35) - 1) i
  ),
  slots as (
    select ((days.d + make_interval(mins => m)) at time zone days.tz) as at
    from days
    join public.availability_rules r on r.teacher_id = p_teacher and r.weekday = extract(dow from days.d)::int
    cross join lateral generate_series(r.start_min, r.end_min - 30, 30) m
  )
  select distinct s.at from slots s
  where s.at >= p_from
    and s.at >= now() + make_interval(mins => (select booking_lead_minutes from public.pricing_settings))
    and not exists (
      select 1 from public.bookings b
      where b.teacher_id = p_teacher and b.status = 'scheduled'
        and tstzrange(b.starts_at, b.starts_at + make_interval(mins => b.minutes)) && tstzrange(s.at, s.at + interval '30 minutes')
    )
  order by 1
$$;

-- 2. Comptes -----------------------------------------------------------------------

alter table public.profiles add column full_name text not null default '';

-- Le nom vient du formulaire d'inscription (full_name) ou du fournisseur (Google : full_name ou name).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120))
  on conflict do nothing;
  return new;
end
$$;

/** Famille du parent connecté, créée à la première visite avec le pays et le fuseau détectés. */
create function public.ensure_my_family(p_country text, p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  fam uuid;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select id into fam from public.families where owner_id = uid;
  if fam is null then
    insert into public.families (owner_id, parent_name, country, timezone)
    values (uid, coalesce(nullif((select full_name from public.profiles where id = uid), ''), 'Parent'),
      case when p_country in ('SN', 'GM', 'FR', 'US', 'CA') then p_country else 'FR' end, p_timezone)
    on conflict (owner_id) do nothing
    returning id into fam;
    if fam is null then select id into fam from public.families where owner_id = uid; end if;
  end if;
  return fam;
end
$$;

-- 3. Candidature enseignant -------------------------------------------------------

alter table public.teachers
  add column status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  add column review_note text,
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  alter column gender drop not null,
  alter column rate_xof drop not null,
  alter column rate_eur drop not null,
  alter column city set default '',
  alter column country_label set default '',
  alter column timezone set default 'Africa/Dakar',
  alter column headline set default '',
  alter column bio set default '',
  alter column subjects set default '{}',
  alter column languages set default '{}',
  drop constraint teachers_subjects_check,
  drop constraint teachers_languages_check;
update public.teachers set status = 'approved', reviewed_at = now() where published;
-- Un profil n'est publié qu'une fois approuvé.
alter table public.teachers add constraint teachers_published_approved check (not published or status = 'approved');
create index on public.teachers (status) where status = 'submitted';

create function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('moderator', 'admin'))
$$;

create function private.my_teacher() returns public.teachers
language plpgsql stable security definer set search_path = '' as $$
declare
  t public.teachers;
begin
  select * into t from public.teachers where user_id = (select auth.uid());
  if t.id is null then raise exception 'not_a_teacher' using errcode = '42501'; end if;
  return t;
end
$$;

/** Ouvre la candidature de l'utilisateur connecté (idempotent). Renvoie l'identifiant du profil enseignant. */
create function public.start_teacher_application() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  tid text;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select id into tid from public.teachers where user_id = uid;
  if tid is null then
    tid := 't-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    insert into public.teachers (id, user_id, name)
    values (tid, uid, coalesce((select full_name from public.profiles where id = uid), ''));
    update public.profiles set role = 'teacher' where id = uid and role = 'family';
  end if;
  return tid;
end
$$;

/**
 * Enregistre la candidature (ou le profil d'un enseignant approuvé).
 * Les diplômes et l'ijaza ne se modifient plus après approbation : ils ont été vérifiés.
 * Les badges de vérification ne sont jamais modifiables ici.
 */
create function public.save_teacher_application(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  c jsonb;
  i int := 0;
begin
  if t.status = 'submitted' then raise exception 'application_under_review' using errcode = 'P0001'; end if;
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

/** Envoie la candidature aux modérateurs, après contrôle des champs obligatoires. */
create function public.submit_teacher_application() returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  missing text[] := '{}';
begin
  if t.status not in ('draft', 'rejected') then raise exception 'not_submittable' using errcode = 'P0001'; end if;
  if length(trim(t.name)) < 3 then missing := missing || 'nom'; end if;
  if t.gender is null then missing := missing || 'genre'; end if;
  if length(trim(t.city)) = 0 then missing := missing || 'ville'; end if;
  if length(trim(t.headline)) < 10 then missing := missing || 'titre'; end if;
  if length(trim(t.bio)) < 80 then missing := missing || 'présentation'; end if;
  if cardinality(t.subjects) = 0 then missing := missing || 'matières'; end if;
  if cardinality(t.languages) = 0 then missing := missing || 'langues'; end if;
  if t.rate_xof is null or t.rate_eur is null then missing := missing || 'tarifs'; end if;
  if not exists (select 1 from public.teacher_credentials where teacher_id = t.id) then missing := missing || 'diplôme ou ijaza'; end if;
  if not exists (select 1 from public.availability_rules where teacher_id = t.id) then missing := missing || 'disponibilités'; end if;
  if cardinality(missing) > 0 then
    raise exception 'incomplete_application' using errcode = 'P0001', detail = array_to_string(missing, ', ');
  end if;
  update public.teachers set status = 'submitted', submitted_at = now(), review_note = null where id = t.id;
end
$$;

/** Remplace les disponibilités hebdomadaires de l'enseignant connecté (minutes locales). */
create function public.set_my_availability(p_rules jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
begin
  if jsonb_array_length(p_rules) > 60 then raise exception 'too_many_rules' using errcode = '22023'; end if;
  delete from public.availability_rules where teacher_id = t.id;
  insert into public.availability_rules (teacher_id, weekday, start_min, end_min)
  select t.id, (r ->> 'weekday')::int, (r ->> 'start')::int, (r ->> 'end')::int from jsonb_array_elements(p_rules) r;
end
$$;

/** Modération : approuve (avec les badges vérifiés) ou refuse une candidature. */
create function public.review_teacher_application(
  p_teacher text, p_approve boolean, p_note text default null,
  p_identity boolean default false, p_diploma boolean default false, p_ijaza boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.teachers where id = p_teacher and status = 'submitted') then
    raise exception 'not_under_review' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.teachers set status = 'approved', published = true, reviewed_at = now(), review_note = nullif(trim(p_note), ''),
      identity_verified = p_identity, diploma_verified = p_diploma, ijaza_verified = p_ijaza
    where id = p_teacher;
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'note_required' using errcode = '22023'; end if;
    update public.teachers set status = 'rejected', published = false, reviewed_at = now(), review_note = left(p_note, 2000) where id = p_teacher;
  end if;
end
$$;

-- 4. Séances côté enseignant --------------------------------------------------------

/** L'enseignant marque la séance effectuée, avec son compte rendu. Ouvre les 48 h de séquestre. */
create function public.deliver_session(p_booking uuid, p_report jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking and teacher_id = t.id for update;
  if b.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  if b.starts_at > now() then raise exception 'not_started' using errcode = 'P0001'; end if;
  if length(trim(coalesce(p_report ->> 'covered', ''))) = 0 then raise exception 'report_required' using errcode = '22023'; end if;
  update public.bookings set status = 'delivered', delivered_at = now() where id = b.id;
  insert into public.session_reports (booking_id, covered, surah, ayah_from, ayah_to, tajwid_notes, homework, comment)
  values (b.id, left(p_report ->> 'covered', 500), (p_report ->> 'surah')::int, (p_report ->> 'ayahFrom')::int, (p_report ->> 'ayahTo')::int,
    left(coalesce(p_report ->> 'tajwidNotes', ''), 2000), left(coalesce(p_report ->> 'homework', ''), 2000), left(coalesce(p_report ->> 'comment', ''), 2000));
end
$$;

/** L'élève ne s'est pas présenté. La règle de paiement des absences reste à trancher : rien n'est versé pour l'instant. */
create function public.mark_session_missed(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers := private.my_teacher();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking and teacher_id = t.id for update;
  if b.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  if b.starts_at + interval '10 minutes' > now() then raise exception 'too_early' using errcode = 'P0001'; end if;
  update public.bookings set status = 'missed' where id = b.id;
end
$$;

-- 5. Droits -----------------------------------------------------------------------

create function private.teaches_learner(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b join public.teachers t on t.id = b.teacher_id
    where b.learner_id = p_learner and t.user_id = (select auth.uid())
  )
$$;

create function private.can_see_teacher(p_teacher text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teachers t
    where t.id = p_teacher and (t.published or t.user_id = (select auth.uid()) or (t.status = 'submitted' and private.is_moderator()))
  )
$$;

grant select (status, review_note, submitted_at, reviewed_at) on public.teachers to authenticated;
grant select (full_name) on public.profiles to authenticated;

create policy "mon profil enseignant (lecture)" on public.teachers for select to authenticated using (user_id = (select auth.uid()));
create policy "candidatures (lecture)" on public.teachers for select to authenticated using (status = 'submitted' and private.is_moderator());

drop policy "profils publiés (lecture)" on public.teacher_credentials;
drop policy "profils publiés (lecture)" on public.availability_rules;
drop policy "profils publiés (lecture)" on public.reviews;
create policy "profils visibles (lecture)" on public.teacher_credentials for select to anon, authenticated using (private.can_see_teacher(teacher_id));
create policy "profils visibles (lecture)" on public.availability_rules for select to anon, authenticated using (private.can_see_teacher(teacher_id));
create policy "profils visibles (lecture)" on public.reviews for select to anon, authenticated using (private.can_see_teacher(teacher_id));

create policy "mes élèves enseignant (lecture)" on public.learners for select to authenticated using (private.teaches_learner(id));

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.owns_family(uuid), private.owns_learner(uuid), private.is_teacher(text), private.can_see_booking(uuid),
  private.teacher_published(text), private.is_moderator(), private.teaches_learner(uuid), private.can_see_teacher(text)
  to anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.free_slots(text, timestamptz, int) to anon, authenticated;
grant execute on function public.price_list(uuid), public.quote(uuid, text, uuid),
  public.book_session(uuid, uuid, text, text, timestamptz, text, text), public.cancel_booking(uuid), public.dispute_booking(uuid, text),
  public.ensure_my_family(text, text), public.start_teacher_application(), public.save_teacher_application(jsonb),
  public.submit_teacher_application(), public.set_my_availability(jsonb), public.review_teacher_application(text, boolean, text, boolean, boolean, boolean),
  public.deliver_session(uuid, jsonb), public.mark_session_missed(uuid)
  to authenticated;

-- 6. Prix pour les visiteurs non connectés ------------------------------------------

/** Prix d'une séance chez chaque enseignant publié, pour un pays de résidence. Public. */
create function public.price_list_for_country(p_country text)
returns table (teacher_id text, amount numeric, currency text)
language sql stable security definer set search_path = '' as $$
  select t.id, p.amount, p.currency
  from public.teachers t, lateral private.session_price(t.id, p_country) p
  where t.published and p_country in (select code from public.countries)
$$;
grant execute on function public.price_list_for_country(text) to anon, authenticated;
