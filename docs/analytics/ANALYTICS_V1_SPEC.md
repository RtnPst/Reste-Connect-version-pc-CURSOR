# Analytics v1 Spec (Minimal, Privacy-Safe)

Status: Draft v1 (pre-implementation)  
Scope: Product behavior + gameplay quality signals  
Non-goals: Marketing attribution, ad tech, invasive telemetry

## Guardrails

- No DB changes in Phase 0
- No migrations in Phase 0
- No new event tracking implementation in Phase 0
- No external analytics in v1
- Aggregate reporting only

## 1) Event Taxonomy (Allowed Names Only)

Only these event names are valid in Analytics v1:

- `mode_started`
- `mode_completed`
- `question_answered`
- `level_result`
- `marathon_ended`
- `daily_completed`
- `post_run_cta_clicked`

No additional event names are permitted without a spec update.

## 2) Common Event Envelope (Strict Contract)

All future analytics events must follow this top-level envelope:

- `event_name` (required): one of the allowed event names
- `occurred_at` (required): ISO UTC timestamp
- `user_id` (required nullable): UUID or `null`
- `session_id` (required): opaque random session identifier
- `run_id` (required nullable): run-scoped id when applicable
- `mode` (required): `theme | daily | level | marathon`
- `app_version` (optional): client/app build string
- `event_props` (required): event-specific JSON object (allowlist only)

Unknown top-level fields are forbidden.

## 3) Event-Specific `event_props` Contract (Allowlist)

### `mode_started`

Allowed `event_props`:

- `entry_surface`: `home | play | deep_link | post_run_cta`
- `level`: integer (only when `mode=level`)
- `theme`: theme key (only when `mode=theme`)
- `is_retry`: boolean (optional)

### `mode_completed`

Allowed `event_props`:

- `score`: integer
- `total_questions`: integer
- `duration_sec`: integer
- `completed`: boolean
- `level`: integer (only when `mode=level`)
- `theme`: theme key (only when `mode=theme`)

### `question_answered` (minimal)

Allowed `event_props`:

- `question_index`: integer
- `correct`: boolean
- `difficulty`: `facile | moyen | difficile`
- `theme`: theme key
- `latency_ms`: integer (optional)

### `level_result`

Allowed `event_props`:

- `level`: integer
- `passed`: boolean
- `score`: integer
- `total_questions`: integer
- `required_to_pass`: integer

### `marathon_ended`

Allowed `event_props`:

- `answered_count`: integer
- `correct_count`: integer
- `best_score_at_end`: integer
- `duration_sec`: integer

### `daily_completed`

Allowed `event_props`:

- `correct`: boolean
- `score`: integer
- `total_questions`: integer
- `already_completed_today`: boolean

### `post_run_cta_clicked`

Allowed `event_props`:

- `cta_id`: fixed enum string
- `source_mode`: `theme | daily | level | marathon`
- `destination`: route path string
- `score_context`: integer (optional)
- `total_context`: integer (optional)

For all events, any extra keys in `event_props` are forbidden.

## 4) Forbidden Fields (Global)

Never collect or store:

- email
- display name
- IP address
- raw question text
- explanation text
- free-text answers
- device fingerprint identifiers
- share payload text/content
- any sensitive personal data

Also disallowed:

- arbitrary user-entered free text blobs
- raw clipboard data
- full user-agent dumps not explicitly approved by spec

## 5) Phase 0 (No-DB) Reporting

Phase 0 uses only existing `quiz_attempts` + `profiles` via read-only queries.

Can answer now (aggregate-only):

- attempts over time
- observed mode distribution from `quiz_attempts`
- theme popularity (where theme is present)
- score/accuracy distribution
- returning-user proxy:
  - users active on multiple dates
  - users with multiple attempts
- profile summary:
  - streak distribution
  - XP distribution

Known blind spots in Phase 0:

- no true start-to-complete funnel
- no pre-completion drop-off
- no CTA click-through
- incomplete mode parity where attempts are not consistently persisted

## 6) Phase 1 (Future) `analytics_events` Table Plan

When Phase 0 proves useful and gaps remain, add a dedicated append-only table.

Proposed schema:

- `id uuid primary key default gen_random_uuid()`
- `occurred_at timestamptz not null default now()`
- `event_name text not null`
- `user_id uuid null`
- `session_id text not null`
- `run_id text null`
- `mode text not null`
- `app_version text null`
- `event_props jsonb not null default '{}'::jsonb`

Proposed indexes:

- `(occurred_at desc)`
- `(event_name, occurred_at desc)`
- `(mode, occurred_at desc)`
- `(user_id, occurred_at desc)` where `user_id is not null`
- optional `(run_id)` where `run_id is not null`

RLS/privacy guidance:

- insert policy must restrict authenticated rows to own `user_id`
- Phase 1 v1 behavior: guest events are skipped client-side (no anon insert policy)
- raw global analytics read access should be admin-only

Retention:

- raw events: 90 days default
- optional extension: up to 180 days
- keep long-lived aggregates, not long-lived raw payloads

## 7) Recommended Implementation Order

1. Run Phase 0 reports first and validate decisions they unlock
2. If gaps remain, implement `mode_started`, `mode_completed`, and `post_run_cta_clicked`
3. Add `question_answered` later (and sample if volume increases)
4. Keep external analytics out until internal taxonomy stabilizes

## Risk Controls

- strict allowlist validation for event names and properties
- reject unknown top-level fields and unknown `event_props` keys
- keep payloads categorical/numeric and minimal
- require spec update before any taxonomy expansion
- periodic privacy review checkpoint before v1.1

