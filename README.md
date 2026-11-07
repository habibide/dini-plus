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
