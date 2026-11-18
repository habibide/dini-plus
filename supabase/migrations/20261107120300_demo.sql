-- Mode démonstration. Chaque visiteur (compte anonyme) reçoit sa propre copie des familles
-- fam-diop et fam-sarr, avec un historique placé autour de maintenant. Les enseignants sont partagés :
-- un créneau réservé par un visiteur disparaît pour les autres, comme en production.
-- Ces fonctions refusent d'agir sur une famille qui n'est pas une famille de démonstration.

create function private.clone_demo(p_template text, p_owner uuid) returns uuid
language plpgsql set search_path = '' as $$
declare
  fam uuid;
  awa uuid; ibrahim uuid; mareme uuid;
  s_awa uuid; s_ibrahim uuid;
  b uuid;
  r record;
  base timestamptz := date_trunc('day', now());
  next_at timestamptz;
begin
  if p_template = 'fam-diop' then
    insert into public.families (owner_id, parent_name, country, timezone, is_adult_learner, demo_template)
    values (p_owner, 'Fatou Diop', 'FR', 'Europe/Paris', false, p_template) returning id into fam;
    insert into public.learners (family_id, name, birth_year, level, goals) values
      (fam, 'Awa Diop', 2017, 'beginner', 'Mémoriser le dernier juz en riwaya Warsh') returning id into awa;
    insert into public.learners (family_id, name, birth_year, level, goals) values
      (fam, 'Ibrahim Diop', 2013, 'intermediate', 'Lire et comprendre l’arabe') returning id into ibrahim;

    insert into public.subscriptions (learner_id, teacher_id, plan_id, sessions_per_month, sessions_remaining, price, currency, renews_at)
    values (awa, 't-aissatou', 'regular', 8, 2, 56, 'EUR', now() + interval '9 days') returning id into s_awa;
    insert into public.subscriptions (learner_id, teacher_id, plan_id, sessions_per_month, sessions_remaining, price, currency, renews_at)
    values (ibrahim, 't-ousmane', 'discovery', 4, 1, 36, 'EUR', now() + interval '13 days') returning id into s_ibrahim;

    -- Historique d'Awa : jours passés à 17 h UTC, puis une séance effectuée il y a 20 h, en attente de validation.
    for r in select * from (values
      (19, 'validated', 'Révision complète d’Al-Fatiha', 1, 1, 7, 'Allongements bien tenus.', 'Réciter chaque matin.', 'Très bon départ, Awa est concentrée.'),
      (15, 'validated', 'An-Nas mémorisée', 114, 1, 6, 'Attention au « sîn » final.', 'Réviser An-Nas et Al-Falaq.', 'Bonne mémoire, un peu rapide.'),
      (12, 'validated', 'Al-Falaq mémorisée', 113, 1, 5, 'Qalqala à consolider.', 'Écouter puis répéter trois fois.', 'Awa progresse bien.'),
      (8, 'missed', null, null, null, null, null, null, null),
      (5, 'validated', 'Al-Ikhlas mémorisée', 112, 1, 4, 'Bonne sortie des lettres emphatiques.', 'Réviser Al-Ikhlas.', 'Séance joyeuse et efficace.')
    ) as v (days_ago, status, covered, surah, ayah_from, ayah_to, tajwid, homework, comment)
    loop
      insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, amount, currency, status, delivered_at)
      values (awa, 't-aissatou', s_awa, 'plan', 'quran', base - make_interval(days => r.days_ago) + interval '17 hours', 7, 'EUR', r.status,
        case when r.status = 'validated' then base - make_interval(days => r.days_ago) + interval '17 hours 30 minutes' end)
      returning id into b;
      if r.covered is not null then
        insert into public.session_reports (booking_id, covered, surah, ayah_from, ayah_to, tajwid_notes, homework, comment)
        values (b, r.covered, r.surah, r.ayah_from, r.ayah_to, r.tajwid, r.homework, r.comment);
      end if;
    end loop;

    insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, amount, currency, status, delivered_at)
    values (awa, 't-aissatou', s_awa, 'plan', 'quran', now() - interval '20 hours', 7, 'EUR', 'delivered', now() - interval '19 hours 30 minutes')
    returning id into b;
    insert into public.session_reports (booking_id, covered, surah, ayah_from, ayah_to, tajwid_notes, homework, comment)
    values (b, 'Al-Masad, versets 1 à 3', 111, 1, 3, 'Awa confond encore les deux « tâ ».', 'Répéter les versets 1 à 3 avant le prochain cours.',
      'Il reste deux versets, on les finit la prochaine fois.');

    -- Historique d'Ibrahim.
    for r in select * from (values
      (16, 'Lecture : les voyelles longues', 'Lire la page 4 à voix haute.', 'Ibrahim lit déjà de manière fluide.'),
      (9, 'Écriture : les lettres liées', 'Copier cinq phrases.', 'À retravailler : les lettres qui ne se lient pas à gauche.')
    ) as v (days_ago, covered, homework, comment)
    loop
      insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, amount, currency, status, delivered_at)
      values (ibrahim, 't-ousmane', s_ibrahim, 'plan', 'arabic', base - make_interval(days => r.days_ago) + interval '17 hours', 9, 'EUR',
        'validated', base - make_interval(days => r.days_ago) + interval '17 hours 30 minutes')
      returning id into b;
      insert into public.session_reports (booking_id, covered, homework, comment) values (b, r.covered, r.homework, r.comment);
    end loop;

    -- Prochaines séances : le premier créneau encore libre.
    select min(x) into next_at from public.free_slots('t-aissatou', now() + interval '1 day', 14) x;
    if next_at is not null then
      insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, amount, currency)
      values (awa, 't-aissatou', s_awa, 'plan', 'quran', next_at, 7, 'EUR');
    end if;
    select min(x) into next_at from public.free_slots('t-ousmane', now() + interval '2 days', 14) x;
    if next_at is not null then
      insert into public.bookings (learner_id, teacher_id, subscription_id, kind, subject, starts_at, amount, currency)
      values (ibrahim, 't-ousmane', s_ibrahim, 'plan', 'arabic', next_at, 9, 'EUR');
    end if;

  elsif p_template = 'fam-sarr' then
    insert into public.families (owner_id, parent_name, country, timezone, is_adult_learner, demo_template)
    values (p_owner, 'Marème Sarr', 'SN', 'Africa/Dakar', true, p_template) returning id into fam;
    insert into public.learners (family_id, name, birth_year, level, goals) values
      (fam, 'Marème Sarr', 1992, 'beginner', 'Reprendre les bases de la prière et des invocations') returning id into mareme;
    select min(x) into next_at from public.free_slots('t-khady', now() + interval '2 days', 14) x;
    if next_at is not null then
      insert into public.bookings (learner_id, teacher_id, kind, subject, starts_at, amount, currency)
      values (mareme, 't-khady', 'trial', 'fiqh', next_at, 1500, 'XOF');
    end if;

  else
    raise exception 'unknown_template' using errcode = '22023';
  end if;
  return fam;
end
$$;

/** Renvoie la famille de démonstration du visiteur pour ce modèle, en la créant au premier appel. */
create function public.ensure_demo_family(p_template text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  fam uuid;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select id into fam from public.families where owner_id = uid and demo_template = p_template;
  if fam is null then
    -- Verrou par visiteur : deux onglets qui démarrent en même temps ne créent pas deux familles.
    perform pg_advisory_xact_lock(hashtext(uid::text || p_template));
    select id into fam from public.families where owner_id = uid and demo_template = p_template;
    if fam is null then fam := private.clone_demo(p_template, uid); end if;
  end if;
  return fam;
end
$$;

create function private.demo_family(p_family uuid) returns public.families
language plpgsql stable set search_path = '' as $$
declare
  f public.families;
begin
  select * into f from public.families where id = p_family and owner_id = (select auth.uid()) and demo_template is not null;
  if f.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return f;
end
$$;

/** Remet la famille de démonstration dans son état de départ. */
create function public.reset_demo(p_family uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  f public.families := private.demo_family(p_family);
begin
  delete from public.families where id = f.id;
  return public.ensure_demo_family(f.demo_template);
end
$$;

/** Démo : l'enseignant marque la séance effectuée, avec son compte rendu. Avance l'horloge jusqu'à la fin de la séance si besoin. */
create function public.demo_deliver(p_booking uuid, p_report jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  f public.families;
  ends timestamptz;
  fam_now timestamptz;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  f := private.demo_family(private.family_of_learner(b.learner_id));
  if b.status <> 'scheduled' then raise exception 'not_scheduled' using errcode = 'P0001'; end if;
  ends := b.starts_at + make_interval(mins => b.minutes);
  fam_now := now() + f.clock_offset;
  if ends > fam_now then
    update public.families set clock_offset = clock_offset + (ends - fam_now) where id = f.id;
    fam_now := ends;
  end if;
  update public.bookings set status = 'delivered', delivered_at = fam_now where id = b.id;
  insert into public.session_reports (booking_id, covered, surah, ayah_from, ayah_to, tajwid_notes, homework, comment)
  values (b.id, coalesce(p_report ->> 'covered', ''), (p_report ->> 'surah')::int, (p_report ->> 'ayahFrom')::int, (p_report ->> 'ayahTo')::int,
    coalesce(p_report ->> 'tajwidNotes', ''), coalesce(p_report ->> 'homework', ''), coalesce(p_report ->> 'comment', ''));
end
$$;

/** Démo : avance l'horloge de la famille, par exemple de 48 h pour libérer le séquestre. */
create function public.demo_advance(p_family uuid, p_hours int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.families := private.demo_family(p_family);
begin
  if p_hours not between 1 and 24 * 30 then raise exception 'invalid_hours' using errcode = '22023'; end if;
  update public.families set clock_offset = clock_offset + make_interval(hours => p_hours) where id = f.id;
  perform private.settle_escrow();
end
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.owns_family(uuid), private.owns_learner(uuid), private.is_teacher(text),
  private.can_see_booking(uuid), private.teacher_published(text) to anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.free_slots(text, timestamptz, int) to anon, authenticated;
grant execute on function public.price_list(uuid), public.quote(uuid, text, uuid),
  public.book_session(uuid, uuid, text, text, timestamptz, text, text), public.cancel_booking(uuid), public.dispute_booking(uuid, text),
  public.ensure_demo_family(text), public.reset_demo(uuid), public.demo_deliver(uuid, jsonb), public.demo_advance(uuid, int)
  to authenticated;
