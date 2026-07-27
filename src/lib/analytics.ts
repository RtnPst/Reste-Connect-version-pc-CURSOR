import { supabase } from "@/integrations/supabase/client";

export const ANALYTICS_PHASE1_ENABLED = (() => {
  const raw = String(import.meta.env.VITE_ANALYTICS_PHASE1_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
})();

type AllowedEventName =
  | "mode_started"
  | "mode_completed"
  | "level_result"
  | "marathon_ended"
  | "post_run_cta_clicked"
  | "share_clicked"
  | "duel_created"
  | "onboarding_completed";

type AllowedMode = "theme" | "daily" | "level" | "marathon" | "duel" | "epoque" | "shell";

type PrimitiveKind = "string" | "number" | "boolean";

const VALID_EVENT_NAMES = new Set<AllowedEventName>([
  "mode_started",
  "mode_completed",
  "level_result",
  "marathon_ended",
  "post_run_cta_clicked",
  "share_clicked",
  "duel_created",
  "onboarding_completed",
]);

const VALID_MODES = new Set<AllowedMode>([
  "theme",
  "daily",
  "level",
  "marathon",
  "duel",
  "epoque",
  "shell",
]);

const EVENT_PROP_SCHEMA: Record<AllowedEventName, Record<string, PrimitiveKind>> = {
  mode_started: {
    entry_surface: "string",
    level: "number",
    theme: "string",
    is_retry: "boolean",
    decade: "string",
  },
  mode_completed: {
    score: "number",
    total_questions: "number",
    duration_sec: "number",
    completed: "boolean",
    level: "number",
    theme: "string",
    decade: "string",
  },
  level_result: {
    level: "number",
    passed: "boolean",
    score: "number",
    total_questions: "number",
    required_to_pass: "number",
  },
  marathon_ended: {
    answered_count: "number",
    correct_count: "number",
    best_score_at_end: "number",
    duration_sec: "number",
  },
  post_run_cta_clicked: {
    cta_id: "string",
    source_mode: "string",
    destination: "string",
    score_context: "number",
    total_context: "number",
  },
  share_clicked: {
    surface: "string",
    outcome: "string",
    has_concept: "boolean",
  },
  duel_created: {
    theme: "string",
    question_count: "number",
  },
  onboarding_completed: {
    destination: "string",
  },
};

type AnalyticsEventInput = {
  event_name: AllowedEventName;
  user_id: string | null | undefined;
  mode: AllowedMode;
  event_props: Record<string, unknown>;
  run_id?: string | null;
  occurred_at?: string;
  app_version?: string;
};

type AnalyticsInsertClient = {
  from: (table: string) => {
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{ error: { message?: string } | null }>;
  };
};

const SESSION_STORAGE_KEY = "analytics_phase1_session_id";
let inMemorySessionId: string | null = null;

function isDev(): boolean {
  return Boolean(import.meta.env.DEV);
}

function warnDev(message: string, extra?: unknown): void {
  if (!isDev()) return;
  if (extra !== undefined) console.warn(`[analytics] ${message}`, extra);
  else console.warn(`[analytics] ${message}`);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnalyticsSessionId(): string {
  if (inMemorySessionId) return inMemorySessionId;
  if (typeof window === "undefined") {
    inMemorySessionId = randomId();
    return inMemorySessionId;
  }
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      inMemorySessionId = existing;
      return existing;
    }
    const created = randomId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    inMemorySessionId = created;
    return created;
  } catch {
    inMemorySessionId = randomId();
    return inMemorySessionId;
  }
}

export function createAnalyticsRunId(): string {
  return randomId();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function validateEvent(input: AnalyticsEventInput): string[] {
  const errs: string[] = [];
  if (!VALID_EVENT_NAMES.has(input.event_name)) errs.push("invalid event_name");
  if (!VALID_MODES.has(input.mode)) errs.push("invalid mode");
  if (!isPlainObject(input.event_props)) errs.push("event_props must be an object");

  const schema = EVENT_PROP_SCHEMA[input.event_name];
  if (!schema || !isPlainObject(input.event_props)) return errs;

  for (const key of Object.keys(input.event_props)) {
    if (!(key in schema)) errs.push(`unknown event_props key: ${key}`);
  }
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in input.event_props)) continue;
    const val = input.event_props[key];
    if (type === "number" && typeof val !== "number") errs.push(`event_props.${key} must be number`);
    if (type === "string" && typeof val !== "string") errs.push(`event_props.${key} must be string`);
    if (type === "boolean" && typeof val !== "boolean")
      errs.push(`event_props.${key} must be boolean`);
  }

  // Mode-specific guardrails for common mistakes.
  if (input.mode !== "level" && "level" in input.event_props) {
    errs.push("event_props.level is only valid for level mode");
  }
  if (input.mode !== "theme" && "theme" in input.event_props && input.event_name !== "duel_created") {
    errs.push("event_props.theme is only valid for theme mode");
  }

  return errs;
}

export async function trackEvent(input: AnalyticsEventInput): Promise<void> {
  // Kill switch: disabled means full no-op.
  if (!ANALYTICS_PHASE1_ENABLED) return;

  // Phase 1 policy: skip guest events entirely.
  const userId = typeof input.user_id === "string" ? input.user_id.trim() : "";
  if (!userId) return;

  const errors = validateEvent(input);
  if (errors.length > 0) {
    warnDev("validation failed; event dropped", { event_name: input.event_name, errors });
    return;
  }

  const row = {
    event_name: input.event_name,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    user_id: userId,
    session_id: getAnalyticsSessionId(),
    run_id: input.run_id ?? null,
    mode: input.mode,
    app_version: input.app_version ?? null,
    event_props: input.event_props,
  };

  try {
    const db = supabase as unknown as AnalyticsInsertClient;
    const { error } = await db.from("analytics_events").insert(row);
    if (error) {
      warnDev("insert failed; event dropped", { event_name: input.event_name, error: error.message });
    }
  } catch (err) {
    warnDev("insert threw; event dropped", {
      event_name: input.event_name,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
