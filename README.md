# DINI, prototype de présentation

Prototype cliquable tiré du document de projet DINI. Il sert à présenter le produit, pas à être mis en production : il n'a ni serveur ni base de données, et les personnes, les avis, les diplômes et les paiements sont fictifs. L'état de la démo reste dans le navigateur (bouton « Réinitialiser » dans le bandeau noir).

## Lancer

```bash
npm install
```

```bash
npm run dev
```

`npm run build` produit `dist/index.html`, un fichier unique à ouvrir ou à envoyer. Les polices viennent de Google Fonts : sans connexion, des polices de secours s'affichent.

## Démo en 5 minutes

Le panneau « Scénario » suit ces étapes et les coche d'elles-mêmes.

1. **Parent** : recherche à facettes, profil, badges cliquables avec le sanad, réservation avec fuseau horaire.
2. **Enseignante** : compte rendu de séance.
3. **Parent** : tableau de bord par enfant, progression par sourate, contestation sous 48 h.
4. **Séquestre** : « Avancer de 48 h » valide la séance et crédite l'enseignante, commission déduite.
5. **Candidature** en six étapes.
6. **Modérateur** : contrôles, décision, puis apparition du profil dans la recherche.

Autres points à montrer : passer de « France, € » à « Sénégal, FCFA » (prix, horaires et moyens de paiement changent), le mode audio seul dans la salle de cours, l'alerte quand on écrit un numéro dans la messagerie.

## Ce qui est simulé

| Dans le prototype | Prévu en production (§9) |
|---|---|
| Paiement sans saisie | Stripe, Wave, Orange Money |
| Salle de cours factice | Daily.co ou Jitsi |
| Extraits audio muets, monogrammes | Vraies récitations et vraies photos |
| Connexion par simple choix de compte | Supabase Auth, SMS |
| Contrôle du créneau dans le navigateur | Verrouillage en base |
| Créneaux saisis en UTC | Règles dans le fuseau de l'enseignant, changements d'heure gérés |

Tarifs et grilles sont indicatifs : ils attendent l'étude tarifaire (§14).
