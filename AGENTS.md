# AGENTS.md — Tu Captes / MonQuiz

Operating brief for any Cursor agent. Read before proposing work.

## Product north star

Tu Captes is a **calm cultural world** you inhabit — not a quiz app, not a mode menu, not a gamified dashboard.

- Value unit = **named captured concept** (« Tu as capté : Ratio »)
- Metaphor = **fil culturel** (return / continue), not pages
- Bottom nav label stays **« Jouer »**
- Human checks occasionally; agent executes most work

Full vision: `docs/product/PRODUCT_VISION.md`

## Already shipped (do not redo)

- Fil Continu Wave (`1001338`) — Accueil reprise, `/play` rail, parcours traces, ReturnToFilCard
- Living home, Path / Le chemin, Continuity capture, Capture beat
- Density-1 DB keys applied (10 vernacular) — coverage ~20.9% live tagged
- Prod: https://tanstack-start-ts.npaysant.workers.dev

## Current priority (execute in order)

1. Content Density **phase 1b+** — small editorial batches (labels + keys together), no mass-tagging
2. Smoke named capture + Accueil echo + parcours Capté after each deploy
3. Light emotional polish (copy / empty states) — **no** new heavy UI
4. Tech theme tagging only after vernacular density feels solid

## Density status (2026-07)

- density-1 applied (~10 vernacular keys)
- density-1b applied (18 social/lifestyle/vocab keys + labels)
- density-1c applied (16 trends/pop-culture keys + labels) — live coverage ~47% (61/129)
- density-1d applied (16 gaming keys + labels) — live coverage ~60% (77/129)
- density-1e applied (18 vocab/réseaux keys + labels) — live coverage ~74% (95/129)
- Target: keep raising **named** capture rate, not raw % alone

## Hard guardrails

- No DB **schema** changes without explicit user OK (data UPDATEs of `concept_key` OK if reviewed)
- No mascot / map / 3D world / visible territories UI
- No mass-tagging `concept_key`
- No Duolingo-guilt streaks / scoreboard worship
- No Track C mass new slugs before density-1 smoke is OK
- Ignore Convex; stack is Vite + React + TanStack + Supabase + Cloudflare Workers

## Content Density notes

- Scripts: `npm run apply:density-1` … `npm run apply:density-1e`, `npm run audit:concept-key-coverage`, `npm run preview:density-1`
- Labels: `src/data/concept-labels-v1.json` (must ship with deploy for memory UI)
- Live `concept_key` updates may need temporary disable of `trg_sync_question_editorial_fields` (canonical_key collisions with archived twins) — see migration `supabase/migrations/20260721120000_density_1_daily_core_vernacular_concept_keys.sql`

## How to work with the creator

- Prefer **doing** over long plans
- One mission at a time
- Report: done / result / remaining / next micro-step
- If visual judgment needed: take Playwright screenshots or ask for a phone screenshot — do not pretend to “see” the live UI without evidence
