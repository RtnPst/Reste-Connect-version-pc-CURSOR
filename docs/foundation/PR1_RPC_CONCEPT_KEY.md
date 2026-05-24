# PR1 — Types + RPC `concept_key`

## Apply migration (required before RPC returns `concept_key`)

**Option A — CLI**

```bash
supabase db push
```

**Option B — Supabase SQL Editor**

Paste and run the full file (includes `DROP FUNCTION` — required when return columns change):

`supabase/migrations/20260524120000_expose_concept_key_in_get_playable_questions.sql`

If you see `42P13: cannot change return type`, the file was run without the `DROP` line — re-run the **entire** updated file.

## Verify RPC (SQL Editor)

```sql
SELECT id, concept_key
FROM get_playable_questions(NULL, NULL, 5)
WHERE concept_key IS NOT NULL;
```

Expect up to 5 rows with non-null `concept_key` (among live pool).

## Rollback

Re-run previous function body from `20260506201000_add_question_editorial_metadata.sql` (without `concept_key` column in RETURNS).
