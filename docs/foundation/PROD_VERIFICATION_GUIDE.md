# Vérifier l’état Supabase (sans être technique)

Ce guide répond à une seule question : **est-ce que les fondations `concept_key` sont déjà en production ?**

Tu n’as pas besoin de savoir le détail des migrations — seulement de lire un **résultat** (vert / orange / rouge).

---

## Méthode 1 — Une commande (recommandée)

À la racine du projet (là où il y a `package.json`), dans un terminal :

```bash
npm run verify:concept-foundation
```

### Comment lire le résultat

| Ligne affichée | Signification |
|----------------|---------------|
| `Connexion Supabase : OK` | On parle bien à ta base prod (via `.env`). |
| `Colonne concept_key : present` | Migration « colonne » appliquée. |
| `Backfill pilote (40) : applied` | Les 40 lignes test du pilote sont en place. |
| `Prochaine étape : …` | Ce que **tu** ou l’agent doit faire ensuite. |

Le détail complet est aussi enregistré dans :

`exports/foundation/concept-foundation-status-latest.json`

**Si la commande échoue avec « fetch failed »** : problème réseau ou `.env` — passe à la **méthode 2** (dashboard Supabase).

---

## Méthode 2 — Dashboard Supabase (copier-coller SQL)

1. Ouvre [supabase.com](https://supabase.com) → ton projet **Tu captes**.
2. Menu **SQL Editor** → **New query**.
3. Colle et exécute :

```sql
-- A) La colonne concept_key existe-t-elle ?
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questions'
  AND column_name = 'concept_key';

-- B) Le pilote ultra-safe est-il appliqué ? (doit retourner 1 ligne : double_text)
SELECT id, concept_key, status
FROM public.questions
WHERE id = '03301bf8-9984-4521-92a3-85492f30fe68';

-- C) Couverture globale (lecture seule)
SELECT
  COUNT(*) FILTER (WHERE status = 'live') AS live_total,
  COUNT(*) FILTER (WHERE status = 'live' AND concept_key IS NOT NULL) AS live_with_concept_key
FROM public.questions;
```

### Interprétation simple

| Résultat A | Résultat B | Verdict |
|------------|------------|---------|
| **0 ligne** | — | Colonne **pas encore** en prod → appliquer migrations (voir ci-dessous). |
| **1 ligne** | `concept_key` = `double_text` | **Fondation pilote OK** → on peut enchaîner le code app. |
| **1 ligne** | `concept_key` = `NULL` | Colonne OK, backfill pilote **pas** fait. |
| **1 ligne** | autre valeur | Anomalie → ne pas continuer sans relecture. |

---

## Si les migrations ne sont pas appliquées

**Ne pas paniquer.** Le repo contient déjà les fichiers ; il faut les **pousser** vers Supabase une fois.

Fichiers concernés (dans l’ordre) :

1. `supabase/migrations/20260509090000_add_questions_concept_key_stage1.sql`
2. `supabase/migrations/20260509120500_backfill_questions_concept_key_ultra_safe_pilot.sql`

**Qui peut le faire :**

- Toi avec l’agent Cursor (`supabase db push`), **ou**
- Toi via le SQL Editor en collant le contenu de chaque fichier (plus long mais possible).

Après application, refaire **méthode 1** ou **méthode 2** jusqu’à `Backfill pilote : applied`.

Runbook détaillé pilote : `exports/dedup-audit/ULTRA_SAFE_CONCEPT_KEY_PILOT_RUNBOOK.md`

---

## Ce qu’on ne vérifie pas ici

- Le contenu JSON local (`cultural-pack-v1.json`) — il n’est **pas** encore le gameplay live.
- Les territoires — pas en base pour l’instant.
- Duel / Marathon — purement interface, indépendant de cette vérif.

---

## Quand revérifier

- **Avant** de merger la première PR « fondation app ».
- **Après** toute opération SQL manuelle en prod.
- **Une fois par semaine** pendant la pause (accumulation silencieuse).
