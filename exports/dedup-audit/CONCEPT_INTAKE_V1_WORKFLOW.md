# Concept Intake v1 (review-only, local-first)

> **v1.2** — Prefer the full loop doc: [`CONCEPT_PIPELINE_V1_2_WORKFLOW.md`](./CONCEPT_PIPELINE_V1_2_WORKFLOW.md)  
> (novelty index, authenticity gate, promote, discovery, question lots).

Goal: create a safe upstream gate for new internet/slang/trend concepts before any AI question generation or DB import.

## Scope and safety

- No DB writes
- No migrations
- No question generation
- No imports
- No auto-publish
- Artifacts and review only

## 1) Prepare input terms

Edit:

- `scripts/data/concept-intake-raw-signals-v1.json`

Add items under `raw_signals` with at least:

- `raw_term`

Optional fields:

- `aliases` (array or string)
- `example_usage`
- `suggested_theme`
- `suggested_difficulty_band`
- `short_definition`
- `trend_freshness`
- `trend_durability`

## 2) Build review artifacts

Run:

`npm run review:concept-intake-v1`

Outputs:

- `exports/dedup-audit/concept-intake-v1-review-latest.csv`
- `exports/dedup-audit/concept-intake-v1-review-latest.json`
- timestamped copies with the same prefix

## 3) Review workflow

Open the CSV and review each row:

- `suggested_concept_key`
- `suggested_theme`
- `suggested_difficulty_band`
- `short_definition`
- `aliases`
- `example_usage`
- `risk_flags`
- duplicate checks:
  - `duplicate_check_exact_concept_key_match`
  - `duplicate_check_near_existing_concept_key`
  - `duplicate_check_possible_semantic_duplicate`

Fill:

- `human_decision` with one of:
  - `approve`
  - `reject`
  - `merge`
  - `watchlist`
- `human_notes`

## 4) How collisions are computed in v1

The script builds a local index of existing concept keys from artifacts if present:

- `concept-key-backfill-preview-latest.csv` (`new_concept_key`)
- `concept-key-group-review-latest.csv` (`final_recommended_concept_key`)
- `concept-key-suggestions-latest.csv` (`concept_key_suggested`)

Then it flags:

- exact concept key match
- near concept key (string similarity)
- possible semantic duplicate (high similarity heuristic)

## 5) What happens next

Concept Intake v1 stops at human-reviewed artifacts.

No generation, no import, and no gameplay integration should happen automatically from this file.

