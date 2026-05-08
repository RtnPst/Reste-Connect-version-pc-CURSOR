-- Analytics Phase 1 (slice A): minimal append-only event store.
-- Scope: schema + RLS only. No route instrumentation in this migration.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_name text not null,
  user_id uuid null references auth.users(id) on delete set null,
  session_id text not null,
  run_id text null,
  mode text not null,
  app_version text null,
  event_props jsonb not null default '{}'::jsonb,
  constraint analytics_events_event_name_allowed check (
    event_name in (
      'mode_started',
      'mode_completed',
      'level_result',
      'marathon_ended',
      'post_run_cta_clicked'
    )
  ),
  constraint analytics_events_mode_allowed check (
    mode in ('theme', 'daily', 'level', 'marathon')
  ),
  constraint analytics_events_event_props_object check (
    jsonb_typeof(event_props) = 'object'
  )
);

alter table public.analytics_events enable row level security;

create index if not exists idx_analytics_events_occurred_at_desc
  on public.analytics_events (occurred_at desc);

create index if not exists idx_analytics_events_event_name_occurred_at_desc
  on public.analytics_events (event_name, occurred_at desc);

create index if not exists idx_analytics_events_mode_occurred_at_desc
  on public.analytics_events (mode, occurred_at desc);

create index if not exists idx_analytics_events_user_id_occurred_at_desc
  on public.analytics_events (user_id, occurred_at desc)
  where user_id is not null;

create index if not exists idx_analytics_events_run_id_not_null
  on public.analytics_events (run_id)
  where run_id is not null;

drop policy if exists "Authenticated users can insert own analytics events" on public.analytics_events;
create policy "Authenticated users can insert own analytics events"
  on public.analytics_events
  for insert
  to authenticated
  with check (
    user_id is not null
    and auth.uid() = user_id
  );

