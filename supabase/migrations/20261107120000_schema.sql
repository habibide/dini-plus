-- Schéma DINI, calqué sur le modèle du document (§10) et sur les types de @dini/core.
-- Les montants sont en numeric (décimal exact, jamais de flottant), toujours avec leur devise.
-- Les instants sont en timestamptz (UTC) ; les disponibilités sont en minutes locales du fuseau de l'enseignant.

create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Plage occupée par une séance. Ajouter des minutes à un timestamptz ne dépend pas du fuseau,
-- d'où IMMUTABLE (Postgres ne peut pas le déduire seul), nécessaire pour la contrainte d'exclusion.
create function private.slot_range(p_starts timestamptz, p_minutes int) returns tstzrange
language sql immutable set search_path = '' as $$
  select tstzrange(p_starts, p_starts + make_interval(mins => p_minutes))
$$;

-- Référentiels ---------------------------------------------------------------

create table public.countries (
  code text primary key check (code in ('SN', 'GM', 'FR', 'US', 'CA')),
  currency text not null check (currency in ('XOF', 'GMD', 'EUR', 'USD', 'CAD')),
  payments text[] not null
);
comment on table public.countries is 'Pays de résidence ouverts. La devise et les moyens de paiement en découlent.';

create table public.plans (
  id text primary key check (id in ('discovery', 'regular', 'intensive', 'hifz')),
  sessions int not null check (sessions > 0)
);
comment on table public.plans is 'Forfaits mensuels. Les libellés restent dans @dini/core (catalog.ts).';

create table public.pricing_settings (
  id boolean primary key default true check (id),
  xof_to_gmd numeric not null,
  eur_to_usd numeric not null,
  eur_to_cad numeric not null,
  trial_discount numeric not null,
  escrow_hours int not null,
  free_cancel_hours int not null,
  booking_lead_minutes int not null
);
comment on table public.pricing_settings is 'Ligne unique. Taux de démonstration et règles du §6, modifiables sans redéployer.';

-- Comptes --------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'family' check (role in ('family', 'teacher', 'moderator', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Extension de auth.users. Le rôle ne se modifie que côté serveur.';

-- Enseignants ----------------------------------------------------------------

create table public.teachers (
  id text primary key,
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  gender text not null check (gender in ('F', 'M')),
  city text not null,
  country_label text not null,
  timezone text not null,
  headline text not null,
  bio text not null,
  subjects text[] not null check (cardinality(subjects) > 0),
  arabic_tracks text[] not null default '{}',
  languages text[] not null check (cardinality(languages) > 0),
  riwayat text[] not null default '{}',
  madhahib text[] not null default '{}',
  levels text[] not null default '{}',
  age_groups text[] not null default '{}',
  rate_xof numeric(12, 2) not null check (rate_xof > 0),
  rate_eur numeric(12, 2) not null check (rate_eur > 0),
  identity_verified boolean not null default false,
  diploma_verified boolean not null default false,
  ijaza_verified boolean not null default false,
  hours_taught numeric(10, 2) not null default 0,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  disputes int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.teachers is 'Profils enseignants. id lisible (t-aissatou) pour rester stable côté front. Seuls les profils publiés sont visibles.';

create table public.teacher_credentials (
  id bigint generated always as identity primary key,
  teacher_id text not null references public.teachers (id) on delete cascade,
  kind text not null check (kind in ('diploma', 'ijaza')),
  title text not null,
  institution text not null,
  year int not null,
  riwaya text,
  sanad text[],
  position int not null default 0
);
create index on public.teacher_credentials (teacher_id);

create table public.availability_rules (
  id bigint generated always as identity primary key,
  teacher_id text not null references public.teachers (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_min int not null check (start_min between 0 and 1440),
  end_min int not null check (end_min between 0 and 1440 and end_min > start_min)
);
create index on public.availability_rules (teacher_id);
comment on table public.availability_rules is 'Plages hebdomadaires en minutes locales du fuseau de l''enseignant (0 = dimanche).';

create table public.reviews (
  id bigint generated always as identity primary key,
  teacher_id text not null references public.teachers (id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  date_label text not null,
  position int not null default 0
);
create index on public.reviews (teacher_id);

-- Familles -------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  parent_name text not null,
  country text not null references public.countries (code),
  timezone text not null,
  is_adult_learner boolean not null default false,
  demo_template text,
  clock_offset interval not null default '0',
  created_at timestamptz not null default now(),
  unique (owner_id, demo_template)
);
create index on public.families (owner_id);
comment on column public.families.demo_template is 'Renseigné pour les familles de démonstration (fam-diop, fam-sarr), clonées par visiteur.';
comment on column public.families.clock_offset is 'Démo uniquement : avance d''horloge (bouton « Avancer de 48 h »). Toujours 0 hors démo.';

create table public.learners (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  birth_year int not null check (birth_year between 1900 and 2100),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  goals text not null default 'À définir avec l’enseignant',
  created_at timestamptz not null default now()
);
create index on public.learners (family_id);

-- Forfaits, séances, paiements ------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  teacher_id text not null references public.teachers (id),
  plan_id text not null references public.plans (id),
  sessions_per_month int not null,
  sessions_remaining int not null check (sessions_remaining >= 0),
  price numeric(12, 2) not null,
  currency text not null,
  renews_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.subscriptions (learner_id);
create index on public.subscriptions (teacher_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  teacher_id text not null references public.teachers (id),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  kind text not null check (kind in ('trial', 'plan')),
  subject text not null,
  starts_at timestamptz not null,
  minutes int not null default 30,
  amount numeric(12, 2) not null,
  currency text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'delivered', 'validated', 'disputed', 'cancelled', 'refunded', 'missed')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  -- Deux séances à venir ne peuvent pas se chevaucher chez un même enseignant : la base tranche, pas le client.
  constraint bookings_no_overlap exclude using gist (
    teacher_id with =,
    private.slot_range(starts_at, minutes) with &&
  ) where (status = 'scheduled')
);
create index on public.bookings (learner_id, starts_at);
create index on public.bookings (teacher_id, starts_at);
create index on public.bookings (subscription_id);
create index on public.bookings (status, delivered_at) where status = 'delivered';

create table public.session_reports (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  covered text not null,
  surah int,
  ayah_from int,
  ayah_to int,
  tajwid_notes text not null default '',
  homework text not null default '',
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  method text not null check (method in ('wave', 'orange_money', 'afrimoney', 'card')),
  provider text not null default 'simulated',
  provider_ref text,
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);
create index on public.payments (family_id);
create index on public.payments (booking_id);
create index on public.payments (subscription_id);
comment on table public.payments is 'Encaissements. provider = simulated tant que Stripe, Wave et Orange Money ne sont pas branchés.';

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  reason text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved_teacher', 'resolved_family')),
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  teacher_id text not null references public.teachers (id),
  booking_id uuid unique references public.bookings (id) on delete set null,
  gross numeric(12, 2) not null,
  currency text not null,
  gross_eur numeric(12, 4) not null,
  commission_rate numeric(4, 3) not null,
  net_eur numeric(12, 4) not null,
  created_at timestamptz not null default now()
);
create index on public.ledger_entries (teacher_id);
comment on table public.ledger_entries is 'Journal des sommes acquises par les enseignants, écrit à la libération du séquestre. Jamais modifié.';
