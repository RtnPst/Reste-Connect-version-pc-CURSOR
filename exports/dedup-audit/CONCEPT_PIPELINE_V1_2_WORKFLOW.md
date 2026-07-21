# Concept pipeline v1.2 — discovery → authenticity → promote → drafts

Goal: find **new** vernacular, check **novelty** + **authenticity**, then integrate **labels/pack/drafts** — with a human gate before any live DB insert.

## Safety

- No autonomous web scrape
- No mass `import:new-questions`
- Promote writes **labels + pack drafts** only when `--apply`
- Question lots stay `draft_review` until you OK an admin insert

## Commands (order)

```bash
# 1) Novelty index (labels + pack + live DB if .env)
npm run audit:concept-novelty

# 2) Propose new candidates (15 curated scenes) + optional merge into raw signals
npm run discover:concepts
npm run discover:concepts -- --merge-signals

# 3) Authenticity gate on raw signals
npm run review:concept-authenticity

# 4) Intake review CSV (novelty + authenticity columns)
npm run review:concept-intake-v1
# → fill human_decision on exports/dedup-audit/concept-intake-v1-review-latest.csv
npm run review:concept-intake-v1-decisions

# 5) Promote approved → concept-labels + cultural-pack drafts
npm run promote:concepts          # dry-run
npm run promote:concepts -- --apply --only=brainrot,delulu

# 6) Question lot (review CSV + src/data/*-pilot-questions-v1.json)
npm run lot:questions -- --only=brainrot,delulu

# 7) Optional: legacy template drafts
npm run review:question-drafts-v1
```

## Human gates

| Step | You decide |
|------|------------|
| Discovery CSV | approve / watchlist / reject |
| Intake CSV | approve / reject / merge / watchlist |
| Question lot CSV | rewrite scenes if needed |
| Live | only after lot OK — small admin insert, never soft-disable-all import |

## Artifacts

| Path | Role |
|------|------|
| `exports/foundation/concept-novelty-index-latest.json` | Known keys |
| `exports/dedup-audit/concept-discovery-v1-latest.csv` | New proposals |
| `exports/dedup-audit/concept-authenticity-v1-latest.csv` | Gate scores |
| `exports/dedup-audit/concept-intake-v1-review-latest.csv` | Intake decisions |
| `exports/foundation/concept-promote-v1-latest.json` | Promote report |
| `src/data/*-pilot-questions-v1.json` | Draft questions |
| `exports/dedup-audit/question-lot-promote-v1-latest.csv` | Lot review |

## Brainrot / delulu (first closed loop)

Already **approved** in intake decisions. After promote+lot:

1. Labels: `brainrot`, `delulu`
2. Pack drafts in `cultural-pack-v1.json`
3. 4 draft questions (2 each) for human review
4. **Not live** until you say OK to insert

## What “integrate” means here

1. **Memory UI** — label exists → « Tu as capté : … » works when questions use the key  
2. **Editorial** — pack draft guides future angles  
3. **Gameplay** — only after questions are live with that `concept_key`
