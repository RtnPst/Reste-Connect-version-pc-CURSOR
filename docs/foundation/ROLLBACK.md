# Rollback — fondation concepts (PR1–PR5)

## Ordre recommandé (prod)

1. **App** : revert le commit `foundation/concepts-v1` (ou cherry-pick inverse des fichiers listés ci-dessous).
2. **DB** (seulement si nécessaire) :
   - PR2 : `DROP TABLE IF EXISTS public.user_concepts_seen CASCADE;` + `DROP FUNCTION IF EXISTS public.upsert_user_concept_seen(text, boolean, text);`
   - PR1 : recréer `get_playable_questions` **sans** colonne `concept_key` (corps dans `20260506201000_add_question_editorial_metadata.sql` + `DROP FUNCTION` d’abord si besoin).

Ne pas supprimer la colonne `questions.concept_key` en prod sauf décision éditoriale explicite.

## Fichiers app (revert ciblé)

- `supabase/migrations/20260524120000_expose_concept_key_in_get_playable_questions.sql`
- `supabase/migrations/20260524150000_create_user_concepts_seen.sql`
- `src/integrations/supabase/types.ts`
- `src/lib/quiz-api.ts`
- `src/lib/concept-memory.ts`
- `src/lib/concept-labels.ts`
- `src/data/concept-labels-v1.json`
- `src/routes/question-du-jour.tsx`
- `src/routes/play.tsx`
- `src/routes/index.tsx`
- `src/routes/reglages.tsx`
- `src/components/AppBottomNav.tsx`
- `package.json` (scripts verify/audit)
- `scripts/verify-concept-foundation.mjs`
- `scripts/audit-concept-key-coverage.mjs`

## Risques si rollback partiel

| Rollback seulement app | RPC `concept_key` en prod reste → OK |
| Rollback seulement DB PR2 | App peut logger `recordConceptSeen failed` → pas de crash |
| Rollback RPC sans DROP | Ancienne app ignore `concept_key` → OK |
