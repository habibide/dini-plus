-- Droits d'accès. Principe : lecture publique du catalogue, lecture privée des données de famille,
-- et aucune écriture directe sur les séances, forfaits, paiements ou le journal (seulement via les RPC).

alter table public.countries enable row level security;
alter table public.plans enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_credentials enable row level security;
alter table public.availability_rules enable row level security;
alter table public.reviews enable row level security;
alter table public.families enable row level security;
alter table public.learners enable row level security;
alter table public.subscriptions enable row level security;
alter table public.bookings enable row level security;
alter table public.session_reports enable row level security;
alter table public.payments enable row level security;
alter table public.disputes enable row level security;
alter table public.ledger_entries enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Catalogue : lisible par tous. teachers.user_id n'est pas exposé.
grant select on public.countries, public.plans, public.pricing_settings, public.teacher_credentials, public.availability_rules, public.reviews
  to anon, authenticated;
grant select (id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib,
  levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes, published)
  on public.teachers to anon, authenticated;

create policy "catalogue lisible (lecture)" on public.countries for select to anon, authenticated using (true);
create policy "catalogue lisible (lecture)" on public.plans for select to anon, authenticated using (true);
create policy "catalogue lisible (lecture)" on public.pricing_settings for select to anon, authenticated using (true);
create policy "profils publiés (lecture)" on public.teachers for select to anon, authenticated using (published);
create policy "profils publiés (lecture)" on public.teacher_credentials for select to anon, authenticated using (private.teacher_published(teacher_id));
create policy "profils publiés (lecture)" on public.availability_rules for select to anon, authenticated using (private.teacher_published(teacher_id));
create policy "profils publiés (lecture)" on public.reviews for select to anon, authenticated using (private.teacher_published(teacher_id));

-- Comptes.
grant select, update (display_name) on public.profiles to authenticated;
create policy "mon profil (lecture)" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "mon profil (modification)" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Familles : le parent voit et modifie sa famille ; la création passe par une RPC.
grant select, update (parent_name, country, timezone) on public.families to authenticated;
create policy "ma famille (lecture)" on public.families for select to authenticated using (owner_id = (select auth.uid()));
create policy "ma famille (modification)" on public.families for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

grant select, insert (family_id, name, birth_year, level, goals), update (name, birth_year, level, goals) on public.learners to authenticated;
create policy "mes élèves (lecture)" on public.learners for select to authenticated using (private.owns_family(family_id));
create policy "mes élèves (ajout)" on public.learners for insert to authenticated with check (private.owns_family(family_id));
create policy "mes élèves (modification)" on public.learners for update to authenticated
  using (private.owns_family(family_id)) with check (private.owns_family(family_id));

-- Activité : lecture seule, pour la famille concernée ou l'enseignant concerné.
grant select on public.subscriptions, public.bookings, public.session_reports, public.payments, public.disputes, public.ledger_entries
  to authenticated;
create policy "famille ou enseignant (lecture)" on public.subscriptions for select to authenticated
  using (private.owns_learner(learner_id) or private.is_teacher(teacher_id));
create policy "famille ou enseignant (lecture)" on public.bookings for select to authenticated
  using (private.owns_learner(learner_id) or private.is_teacher(teacher_id));
create policy "famille ou enseignant (lecture)" on public.session_reports for select to authenticated using (private.can_see_booking(booking_id));
create policy "famille ou enseignant (lecture)" on public.disputes for select to authenticated using (private.can_see_booking(booking_id));
create policy "ma famille (lecture)" on public.payments for select to authenticated using (private.owns_family(family_id));
create policy "mon journal (lecture)" on public.ledger_entries for select to authenticated using (private.is_teacher(teacher_id));

-- Fonctions : rien n'est exécutable par défaut, puis on ouvre au cas par cas.
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.owns_family(uuid), private.owns_learner(uuid), private.is_teacher(text),
  private.can_see_booking(uuid), private.teacher_published(text) to anon, authenticated;

grant execute on function public.free_slots(text, timestamptz, int) to anon, authenticated;
grant execute on function public.price_list(uuid), public.quote(uuid, text, uuid),
  public.book_session(uuid, uuid, text, text, timestamptz, text, text), public.cancel_booking(uuid), public.dispute_booking(uuid, text)
  to authenticated;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
