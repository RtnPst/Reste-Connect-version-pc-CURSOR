# Ultra-Safe concept_key pilot runbook

Scope: apply **only** migration `20260509120500_backfill_questions_concept_key_ultra_safe_pilot.sql` and validate.

## 1) Push migration

From repo root:

```bash
supabase db push
```

## 2) Run post-apply validation SQL

Run this SQL file in your SQL editor / psql:

- `exports/dedup-audit/ultra-safe-concept-backfill-pilot-post-apply-validation-latest.sql`

It contains:

1. A count query (`mapped_rows_with_expected_key`)
2. A mismatch listing query

## 3) Expected results

- Count query returns: **40**
- Mismatch query returns: **0 rows**

## 4) Rollback path

Rollback SQL file:

- `exports/dedup-audit/ultra-safe-concept-backfill-pilot-rollback-latest.sql`

Run it manually if needed (it reverts to `NULL` for pilot rows that still hold the pilot-applied keys).

## 5) If `supabase db push` reports older pending migrations

Do **not** force-apply blindly.

Checklist:

1. Inspect pending list.
2. Confirm those migrations are expected for this environment.
3. If environment drift is unclear, stop and reconcile migration state first (local vs remote history).
4. Re-run `supabase db push` only after reconciliation.

## 6) If validation count is not 40

1. Run the mismatch query section (already in validation SQL) and inspect returned IDs.
2. Do **not** continue with additional backfills.
3. If needed, execute rollback SQL:
   - `exports/dedup-audit/ultra-safe-concept-backfill-pilot-rollback-latest.sql`
4. Re-check migration state and mapping file before retry.

