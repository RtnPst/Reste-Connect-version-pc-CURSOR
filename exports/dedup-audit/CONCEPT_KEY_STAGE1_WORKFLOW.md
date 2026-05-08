# concept_key Stage 1 workflow (metadata-only)

Scope for Stage 1:

- Add nullable `questions.concept_key` for editorial/import/dedup metadata.
- No gameplay query changes.
- No concepts table yet.
- No bulk backfill in one shot without review artifacts.

## Convention

- lowercase
- ASCII slug
- accents removed
- spaces converted to underscores
- punctuation removed
- no language prefix for Stage 1

Examples:

- `pov`
- `npc`
- `ratio`
- `ghosting`
- `mot_de_passe_fort`

## Suggested review flow

1. Generate preview suggestions (read-only):

```bash
npm run suggest:concept-keys-stage1
```

2. Review:

- `exports/dedup-audit/concept-key-group-suggestions-latest.csv`
- `exports/dedup-audit/concept-key-suggestions-latest.csv`

3. Fill reviewer columns:

- `review_status` (`approved` / `needs_split` / `needs_merge` / `skip`)
- `reviewer_notes`

4. Keep DB unchanged until review quality is acceptable.

## Admin/import support (safe Stage 1)

- Show optional `concept_key` field in admin editor.
- In CSV import/review, accept optional `concept_key`.
- If missing, import tooling can suggest `concept_key` and flag semantic-near candidates for manual review.
- Warn (do not block) when incoming rows look semantically close to an existing `concept_key`.

## Batch 2 implication

- Keep Batch 2 as preview artifact for now.
- Re-review dormant duplicate families by `concept_key` first.
- Decide intentional multi-formulation concepts before any archive apply.
