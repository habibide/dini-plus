# DINI

Marketplace d’enseignement religieux en ligne : site web et application mobile sur un backend Supabase, avec de vrais comptes.

## Organisation

| Dossier | Contenu |
|---|---|
| `apps/web` | Site Next.js 16 : accueil, recherche, profil, réservation, suivi parent, connexion, candidature et espace enseignant, modération |
| `apps/mobile` | Application Expo SDK 58 (iOS, Android) : recherche, réservation, suivi, connexion, agenda et comptes rendus enseignant |
| `packages/core` | Catalogue (pays, langues, matières), règles métier (prix, commission, séquestre, annulation, fuseaux horaires), types |
| `packages/data` | API Supabase et hooks React communs au web et au mobile |
| `prototype` | Premier prototype de présentation, publié sur GitHub Pages |

Les écrans ne connaissent que l’API de `packages/data`. La candidature et les disponibilités enseignant se remplissent sur le web.

## Lancer

Node 24 est requis (`.nvmrc`).

```bash
nvm use
```

```bash
npm install
```

```bash
npm run dev:web
```

```bash
npm run dev:mobile
```

Puis scannez le QR code avec Expo Go, ou ouvrez le simulateur iOS.

```bash
npm test
```

Taux de change fixes, à remplacer : FCFA ↔ dalasi, euro ↔ dollar américain et canadien (table `pricing_settings`).

## Backend Supabase

Le schéma vit dans `supabase/migrations/` (appliqué au projet « Dine App »). Les apps web et mobile exigent `apps/web/.env.local` et `apps/mobile/.env.local` (modèles dans les `.env.example`).

- **Comptes** : e-mail et mot de passe, Google, Facebook, Apple (à activer dans Supabase, Authentication, Providers). Un profil par compte, avec un rôle : famille, enseignant, modérateur, administrateur. Le rôle de modérateur se donne en base.
- **Familles** : créées à la première connexion avec le pays et le fuseau choisis. Une famille ne lit que ses propres données.
- **Enseignants** : candidature en ligne (profil, matières, tarifs, diplômes, ijaza et sanad, disponibilités), envoyée puis approuvée ou refusée par un modérateur. Seuls les profils approuvés sont publiés.
- **Espace enseignant** : séances à venir, compte rendu après chaque séance (ou absence de l'élève), disponibilités, gains et palier de commission.
- **Règles côté serveur (RPC)** : prix, créneaux libres, réservation, annulation, litige, candidature, modération, compte rendu. Une contrainte d'exclusion interdit deux séances qui se chevauchent chez un même enseignant.
- **Visioconférence** : la fonction serveur `join-session` (`supabase/functions/`) vérifie que l'appelant est l'enseignant ou la famille de la séance, crée une salle Daily privée à la première entrée et remet à chacun une adresse nominative. La salle ouvre 10 minutes avant et ferme 15 minutes après la fin prévue. Secret requis : `DAILY_API_KEY` (Supabase, Edge Functions, Secrets).
- **Formats** : cours de 50 minutes, au tarif fixé par l'enseignant ; séance d'essai de 30 minutes à moitié prix, une par élève et par enseignant. Durées dans `pricing_settings`.
- **Absences** : l'enseignant signale l'absence de l'élève ; la séance lui est due, sauf contestation de la famille dans les 48 h.
- **Séquestre** : `pg_cron` libère toutes les 10 minutes les séances non contestées depuis 48 h, et inscrit la part de l'enseignant (commission dégressive) au journal.
- **Paiements** : simulés (`provider = 'simulated'`) tant que Stripe, Wave, Orange Money et Afrimoney ne sont pas branchés.

Le catalogue de départ (10 enseignants fictifs) est généré depuis `@dini/data` et doit être retiré avant l'ouverture au public :

```bash
npx tsx supabase/scripts/generate-seed.ts > supabase/migrations/<horodatage>_catalog_seed.sql
```
