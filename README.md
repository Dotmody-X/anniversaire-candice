# Les 50 ans de Candice 🎉

Site mobile-first pour l'anniversaire de Candice : lien vers la cagnotte Tribee
(travaux du coin de paradis ardéchois) et mur des photos de la soirée
(les invités déposent leurs photos prises pendant la fête, avec légende optionnelle).

## Stack

- **HTML / CSS / JS vanilla** — aucun build, le dossier se déploie tel quel
  (GitHub Pages, Netlify, Vercel…).
- **Supabase** — table `candice_souvenirs` + bucket `candice-souvenirs` pour le
  mur des souvenirs (lecture et dépôt publics via RLS).
- **Fonts** : Reenie Beanie (manuscrite, accents) + Lora (titres et texte).

## Lancer en local

```bash
python3 -m http.server 4173
# → http://localhost:4173
```

## ⚠️ Dernière étape : activer le mur des souvenirs

Le site est configuré pour le projet Supabase **`pjehsndnhrypnqcqyasn`**
(org Truber — table et bucket isolés, préfixés `candice`, aucun impact sur le reste).
Il reste à appliquer le schéma :

1. Ouvrir le [SQL Editor du projet](https://supabase.com/dashboard/project/pjehsndnhrypnqcqyasn/sql/new).
2. Coller le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécuter.

C'est tout — le formulaire et la galerie s'activent automatiquement.
Tant que ce n'est pas fait, le site affiche « le mur des souvenirs ouvre très bientôt… ».

> Pour utiliser un **autre** projet Supabase à la place : appliquer `schema.sql`
> dessus, puis mettre à jour `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans
> [`js/config.js`](js/config.js) (la clé *anon* est publique par design).

## L'effet signature

L'illu « 50 » occupe tout l'écran à l'arrivée, puis vole se poser en logo dans
la nav au scroll (`js/main.js`). Respecte `prefers-reduced-motion` (fondu simple).
