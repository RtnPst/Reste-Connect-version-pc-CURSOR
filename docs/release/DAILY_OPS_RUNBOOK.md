# Daily fil ops runbook

## Goal

Keep `daily_questions` continuous so Accueil / Jouer never show « Rien n’est calé ».

## Check (local)

```bash
node --env-file=.env scripts/check-daily-calendar.mjs 45
```

- Exit `0` = no gaps in the window
- Exit `2` = gaps listed in `gapsPreview`

## Cadence

- Weekly: run the check
- At least **14 days before** the last scheduled date: refill another 3–4 weeks
- Current runway (as of Jul 2026 ship): through **2026-08-27**

## Refill

1. Pick live FR concepts (prefer density ≥2 questions)
2. Insert into `daily_questions (question_id, active_date)` with `NOT EXISTS` on `active_date`
3. Prefer Paris calendar dates
4. Re-run `check-daily-calendar.mjs`

## Admin

Cockpit → look for « Fil du jour » status card (scheduled count / last date). Full calendar editor can come later; the script is the source of truth for gaps.
