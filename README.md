# DINI

Marketplace d’enseignement religieux en ligne : site web et application mobile, branchés pour l’instant sur des **données fictives**, sans backend ni base de données.

## Organisation

| Dossier | Contenu |
|---|---|
| `apps/web` | Site Next.js 16 : accueil, recherche, profil enseignant, réservation, suivi parent, compte rendu |
| `apps/mobile` | Application Expo SDK 58 (iOS, Android) : mêmes parcours, en onglets |
| `packages/core` | Catalogue (pays, langues, matières), règles métier (prix, commission, séquestre, annulation, fuseaux horaires), types |
| `packages/data` | API fictive et hooks React communs au web et au mobile |
| `prototype` | Premier prototype de présentation, publié sur GitHub Pages |

Les écrans ne connaissent que l’API de `packages/data`. Pour brancher Supabase, il suffira d’écrire une seconde implémentation de `createMockApi`, sans toucher aux écrans.

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

## Données de démonstration

Les enseignants, avis, diplômes et sanad sont fictifs. Les données sont conservées dans le navigateur (web) ou sur le téléphone (mobile) ; le bouton « Réinitialiser » les remet à zéro. Sur le web, « Avancer de 48 h » fait passer le séquestre.

Taux de change fixes de démonstration : FCFA ↔ dalasi, euro ↔ dollar américain et canadien.

## Backend Supabase

Le schéma vit dans `supabase/migrations/` (appliqué au projet « Dine App ») :

- **Tables** : catalogue (pays, forfaits, réglages de prix, enseignants, diplômes, disponibilités, avis), familles, élèves, forfaits, séances, comptes rendus, paiements, litiges, journal des sommes dues aux enseignants.
- **Droits (RLS)** : catalogue lisible par tous ; une famille ne lit que ses propres données ; aucune écriture directe sur les séances, forfaits ou paiements.
- **Règles côté serveur (RPC)** : `free_slots`, `price_list`, `quote`, `book_session`, `cancel_booking`, `dispute_booking`. Le prix, la disponibilité et les droits sont recalculés en base. Une contrainte d'exclusion interdit deux séances qui se chevauchent chez un même enseignant.
- **Séquestre** : `pg_cron` libère toutes les 10 minutes les séances non contestées depuis 48 h, et inscrit la part de l'enseignant (commission dégressive) au journal.
- **Démo** : chaque visiteur se connecte en anonyme et reçoit sa propre copie des familles `fam-diop` et `fam-sarr` (`ensure_demo_family`, `reset_demo`, `demo_deliver`, `demo_advance`). Les séances de démo ne bloquent pas les agendas des autres familles et ne créditent jamais les enseignants.
- **Paiements** : simulés (`provider = 'simulated'`) tant que Stripe, Wave, Orange Money et Afrimoney ne sont pas branchés.

Les apps utilisent Supabase quand `apps/web/.env.local` et `apps/mobile/.env.local` existent (modèles dans les `.env.example`), sinon les données fictives. Prérequis côté projet Supabase : activer les connexions anonymes (Authentication, Sign In / Providers, Anonymous).

Le catalogue en base est généré depuis `@dini/data` :

```bash
npx tsx supabase/scripts/generate-seed.ts > supabase/migrations/<horodatage>_catalog_seed.sql
```
