export type CockpitTabId =
  | "overview"
  | "concept_intake"
  | "question_drafts"
  | "editorial_health"
  | "analytics"
  | "batch_reviews"
  | "legacy";

export type AdminCockpitMeta = {
  schema_version: string;
  generated_at: string;
  sources: Array<{
    key: string;
    path: string;
    exists: boolean;
    row_count: number | null;
    mtime: string | null;
  }>;
  warnings: Array<{
    code: string;
    key?: string;
    path?: string;
  }>;
};

export type AdminCockpitOverview = {
  generated_at: string;
  kpis: Record<string, number | boolean>;
  alerts?: Array<{
    source: string;
    item: string;
    severity: string;
    reason: string;
  }>;
};

export const EMPTY_META: AdminCockpitMeta = {
  schema_version: "admin_cockpit_snapshot_v1",
  generated_at: "",
  sources: [],
  warnings: [],
};

export const EMPTY_OVERVIEW: AdminCockpitOverview = {
  generated_at: "",
  kpis: {},
  alerts: [],
};

/** Whitelisted row shape for concept intake snapshot (public JSON contract). */
export type ConceptIntakeRow = {
  raw_term: string;
  suggested_concept_key: string;
  suggested_theme: string;
  suggested_difficulty_band: string;
  short_definition: string;
  aliases: string;
  example_usage: string;
  trend_freshness: string;
  trend_durability: string;
  confidence: string;
  risk_flags: string[];
  duplicate_check_exact_concept_key_match: string;
  duplicate_check_near_existing_concept_key: string;
  duplicate_check_possible_semantic_duplicate: string;
  human_decision: string;
  human_notes: string;
  decision_status: string;
};

export type AdminCockpitConceptIntake = {
  generated_at: string;
  rows: ConceptIntakeRow[];
  stats: { total_rows: number | null };
};

export const EMPTY_CONCEPT_INTAKE: AdminCockpitConceptIntake = {
  generated_at: "",
  rows: [],
  stats: { total_rows: null },
};

/** Whitelisted row shape for question drafts snapshot (public JSON contract). */
export type QuestionDraftRow = {
  concept_key: string;
  question_type: string;
  suggested_theme: string;
  difficulty: string;
  question: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_index: number;
  explanation: string;
  tone_risk_notes: string;
  duplicate_collision_notes: string;
  human_decision: string;
  human_notes: string;
};

export type AdminCockpitQuestionDrafts = {
  generated_at: string;
  rows: QuestionDraftRow[];
  stats: { total_rows: number | null; pending_review_rows: number | null };
};

export const EMPTY_QUESTION_DRAFTS: AdminCockpitQuestionDrafts = {
  generated_at: "",
  rows: [],
  stats: { total_rows: null, pending_review_rows: null },
};

/** Editorial health — priority queue rows (snapshot contract). */
export type EditorialPriorityQueueRow = {
  raw_term: string;
  suggested_concept_key: string;
  suggested_theme: string;
  confidence: string;
  trend_freshness: string;
  trend_durability: string;
  risk_flags: string[];
  human_decision: string;
  unresolved_age_days_estimate: number | null;
  priority_bucket: string;
  queue_reason: string;
};

export type EditorialFreshnessRow = {
  raw_term: string;
  concept_key: string;
  confidence: string;
  trend_freshness: string;
  trend_durability: string;
  human_decision: string;
  unresolved_age_days_estimate: number | null;
  risk_flags: string[];
  freshness_score: number | null;
  freshness_band: string;
  refresh_note: string;
};

export type EditorialNeedsRefreshRow = {
  raw_term: string;
  concept_key: string;
  human_decision: string;
  trend_freshness: string;
  trend_durability: string;
  unresolved_age_days_estimate: number | null;
  risk_flags: string[];
  refresh_reason: string;
  severity: string;
  action_note: string;
};

export type EditorialOverexposureRow = {
  concept_key: string;
  draft_count: number | null;
  draft_definition_count: number | null;
  draft_contextual_count: number | null;
  dormant_variant_group_count: number | null;
  dormant_variant_question_count: number | null;
  saturation_index: number | null;
  saturation_risk_band: string;
  review_note: string;
};

export type EditorialSection<T> = { rows: T[]; total_rows: number | null };

export type AdminCockpitEditorialHealth = {
  generated_at: string;
  priority_queue: EditorialSection<EditorialPriorityQueueRow>;
  freshness: EditorialSection<EditorialFreshnessRow>;
  needs_refresh: EditorialSection<EditorialNeedsRefreshRow>;
  overexposure: EditorialSection<EditorialOverexposureRow>;
  safe_evergreen_counts_only: { total_rows: number | null };
};

export const EMPTY_EDITORIAL_HEALTH: AdminCockpitEditorialHealth = {
  generated_at: "",
  priority_queue: { rows: [], total_rows: null },
  freshness: { rows: [], total_rows: null },
  needs_refresh: { rows: [], total_rows: null },
  overexposure: { rows: [], total_rows: null },
  safe_evergreen_counts_only: { total_rows: null },
};

export type AnalyticsMetricRow = { metric: string; value: number | null; dimension: string };

export type AdminCockpitAnalyticsSummary = {
  generated_at: string;
  phase0: {
    summary: Record<string, number>;
    attempts_over_time: Array<{ date: string; attempt_count: number | null }>;
    mode_distribution: Array<{ mode: string; attempt_count: number | null; share_percent: number | null }>;
    theme_popularity: Array<{ theme: string; attempt_count: number | null; share_percent: number | null }>;
    accuracy_bands: Array<{ band: string; attempt_count: number | null; share_percent: number | null }>;
    returning_user_proxy: Array<{ metric: string; value: number | null }>;
    profiles_summary: AnalyticsMetricRow[];
  };
  phase1: {
    analytics_events_available: boolean;
    analytics_event_count: number | null;
    starts_vs_completions_by_mode: Array<{
      mode: string;
      starts: number | null;
      completions: number | null;
      completion_rate_percent: number | null;
    }>;
    level_pass_fail_summary: Array<{ band: string; pass: number | null; fail: number | null }>;
    marathon_end_distribution: Array<{ correct_band: string; ended_sessions: number | null }>;
    cta_clickthrough_summary: Array<{
      mode: string;
      clicks: number | null;
      completions: number | null;
      click_through_percent: number | null;
    }>;
    event_volume_by_event_name_mode: Array<{ event_name: string; mode: string; count: number | null }>;
    data_quality_checks: Array<{ metric: string; value: number | null }>;
  };
  blind_spots: string[];
  safety: Record<string, boolean>;
};

export const EMPTY_ANALYTICS_SUMMARY: AdminCockpitAnalyticsSummary = {
  generated_at: "",
  phase0: {
    summary: {},
    attempts_over_time: [],
    mode_distribution: [],
    theme_popularity: [],
    accuracy_bands: [],
    returning_user_proxy: [],
    profiles_summary: [],
  },
  phase1: {
    analytics_events_available: false,
    analytics_event_count: null,
    starts_vs_completions_by_mode: [],
    level_pass_fail_summary: [],
    marathon_end_distribution: [],
    cta_clickthrough_summary: [],
    event_volume_by_event_name_mode: [],
    data_quality_checks: [],
  },
  blind_spots: [],
  safety: {},
};

/** Batch reviews — intentionally omits `current_status_is_active` (may contain question UUIDs). */
export type BatchReviewRow = {
  duplicate_group_id: string;
  concept_key: string;
  question_count: number;
  difficulty_differences: string;
  choice_differences: string;
  explanation_differences: string;
  category: string;
  recommended_action: string;
  reason: string;
  risk_level: string;
  archive_only_later: string;
};

export type AdminCockpitBatchReviews = {
  generated_at: string;
  rows: BatchReviewRow[];
};

export const EMPTY_BATCH_REVIEWS: AdminCockpitBatchReviews = {
  generated_at: "",
  rows: [],
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`snapshot_fetch_failed:${path}:${res.status}`);
  return res.json();
}

export async function loadMetaSnapshot(): Promise<{
  data: AdminCockpitMeta;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/meta.json");
    if (!isPlainObject(raw)) return { data: EMPTY_META, warning: "meta_invalid_shape" };
    const sources = Array.isArray(raw.sources)
      ? raw.sources.filter(isPlainObject).map((s) => ({
          key: String(s.key ?? ""),
          path: String(s.path ?? ""),
          exists: Boolean(s.exists),
          row_count: typeof s.row_count === "number" ? s.row_count : null,
          mtime: typeof s.mtime === "string" ? s.mtime : null,
        }))
      : [];
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.filter(isPlainObject).map((w) => ({
          code: String(w.code ?? ""),
          key: typeof w.key === "string" ? w.key : undefined,
          path: typeof w.path === "string" ? w.path : undefined,
        }))
      : [];
    return {
      data: {
        schema_version: String(raw.schema_version ?? "admin_cockpit_snapshot_v1"),
        generated_at: String(raw.generated_at ?? ""),
        sources,
        warnings,
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_META,
      warning: err instanceof Error ? err.message : "meta_unavailable",
    };
  }
}

export async function loadOverviewSnapshot(): Promise<{
  data: AdminCockpitOverview;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/overview.json");
    if (!isPlainObject(raw)) return { data: EMPTY_OVERVIEW, warning: "overview_invalid_shape" };
    const kpis = isPlainObject(raw.kpis)
      ? Object.fromEntries(
          Object.entries(raw.kpis).filter(
            ([, v]) => typeof v === "number" || typeof v === "boolean",
          ),
        )
      : {};
    const alerts = Array.isArray(raw.alerts)
      ? raw.alerts
          .filter(isPlainObject)
          .map((a) => ({
            source: String(a.source ?? ""),
            item: String(a.item ?? ""),
            severity: String(a.severity ?? ""),
            reason: String(a.reason ?? ""),
          }))
      : [];
    return {
      data: {
        generated_at: String(raw.generated_at ?? ""),
        kpis,
        alerts,
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_OVERVIEW,
      warning: err instanceof Error ? err.message : "overview_unavailable",
    };
  }
}

function strField(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

function finiteNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function strArrField(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function parseConceptIntakeRow(raw: unknown): ConceptIntakeRow | null {
  if (!isPlainObject(raw)) return null;
  const risk_flags = Array.isArray(raw.risk_flags)
    ? raw.risk_flags.filter((x): x is string => typeof x === "string")
    : [];
  return {
    raw_term: strField(raw, "raw_term"),
    suggested_concept_key: strField(raw, "suggested_concept_key"),
    suggested_theme: strField(raw, "suggested_theme"),
    suggested_difficulty_band: strField(raw, "suggested_difficulty_band"),
    short_definition: strField(raw, "short_definition"),
    aliases: strField(raw, "aliases"),
    example_usage: strField(raw, "example_usage"),
    trend_freshness: strField(raw, "trend_freshness"),
    trend_durability: strField(raw, "trend_durability"),
    confidence: strField(raw, "confidence"),
    risk_flags,
    duplicate_check_exact_concept_key_match: strField(raw, "duplicate_check_exact_concept_key_match"),
    duplicate_check_near_existing_concept_key: strField(raw, "duplicate_check_near_existing_concept_key"),
    duplicate_check_possible_semantic_duplicate: strField(raw, "duplicate_check_possible_semantic_duplicate"),
    human_decision: strField(raw, "human_decision"),
    human_notes: strField(raw, "human_notes"),
    decision_status: strField(raw, "decision_status"),
  };
}

export async function loadConceptIntakeSnapshot(): Promise<{
  data: AdminCockpitConceptIntake;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/concept_intake.json");
    if (!isPlainObject(raw)) {
      return { data: EMPTY_CONCEPT_INTAKE, warning: "concept_intake_invalid_shape" };
    }
    const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
    const rows: ConceptIntakeRow[] = [];
    for (const item of rowsRaw) {
      const row = parseConceptIntakeRow(item);
      if (row) rows.push(row);
    }
    let total_rows: number | null = null;
    if (isPlainObject(raw.stats) && typeof raw.stats.total_rows === "number") {
      total_rows = raw.stats.total_rows;
    }
    return {
      data: {
        generated_at: String(raw.generated_at ?? ""),
        rows,
        stats: { total_rows },
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_CONCEPT_INTAKE,
      warning: err instanceof Error ? err.message : "concept_intake_unavailable",
    };
  }
}

function parseQuestionDraftRow(raw: unknown): QuestionDraftRow | null {
  if (!isPlainObject(raw)) return null;
  const ci = raw.correct_index;
  let correct_index = 0;
  if (typeof ci === "number" && Number.isFinite(ci)) {
    correct_index = Math.max(0, Math.min(3, Math.trunc(ci)));
  }
  return {
    concept_key: strField(raw, "concept_key"),
    question_type: strField(raw, "question_type"),
    suggested_theme: strField(raw, "suggested_theme"),
    difficulty: strField(raw, "difficulty"),
    question: strField(raw, "question"),
    choice_1: strField(raw, "choice_1"),
    choice_2: strField(raw, "choice_2"),
    choice_3: strField(raw, "choice_3"),
    choice_4: strField(raw, "choice_4"),
    correct_index,
    explanation: strField(raw, "explanation"),
    tone_risk_notes: strField(raw, "tone_risk_notes"),
    duplicate_collision_notes: strField(raw, "duplicate_collision_notes"),
    human_decision: strField(raw, "human_decision"),
    human_notes: strField(raw, "human_notes"),
  };
}

export async function loadQuestionDraftsSnapshot(): Promise<{
  data: AdminCockpitQuestionDrafts;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/question_drafts.json");
    if (!isPlainObject(raw)) {
      return { data: EMPTY_QUESTION_DRAFTS, warning: "question_drafts_invalid_shape" };
    }
    const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
    const rows: QuestionDraftRow[] = [];
    for (const item of rowsRaw) {
      const row = parseQuestionDraftRow(item);
      if (row) rows.push(row);
    }
    let total_rows: number | null = null;
    let pending_review_rows: number | null = null;
    if (isPlainObject(raw.stats)) {
      if (typeof raw.stats.total_rows === "number") total_rows = raw.stats.total_rows;
      if (typeof raw.stats.pending_review_rows === "number") {
        pending_review_rows = raw.stats.pending_review_rows;
      }
    }
    return {
      data: {
        generated_at: String(raw.generated_at ?? ""),
        rows,
        stats: { total_rows, pending_review_rows },
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_QUESTION_DRAFTS,
      warning: err instanceof Error ? err.message : "question_drafts_unavailable",
    };
  }
}

function parseEditorialSection<T>(
  raw: unknown,
  parseRow: (row: unknown) => T | null,
): EditorialSection<T> {
  if (!isPlainObject(raw)) return { rows: [], total_rows: null };
  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: T[] = [];
  for (const item of rowsRaw) {
    const r = parseRow(item);
    if (r) rows.push(r);
  }
  const total_rows = typeof raw.total_rows === "number" ? raw.total_rows : null;
  return { rows, total_rows };
}

function parsePriorityQueueRow(raw: unknown): EditorialPriorityQueueRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    raw_term: strField(raw, "raw_term"),
    suggested_concept_key: strField(raw, "suggested_concept_key"),
    suggested_theme: strField(raw, "suggested_theme"),
    confidence: strField(raw, "confidence"),
    trend_freshness: strField(raw, "trend_freshness"),
    trend_durability: strField(raw, "trend_durability"),
    risk_flags: strArrField(raw, "risk_flags"),
    human_decision: strField(raw, "human_decision"),
    unresolved_age_days_estimate: finiteNum(raw.unresolved_age_days_estimate),
    priority_bucket: strField(raw, "priority_bucket"),
    queue_reason: strField(raw, "queue_reason"),
  };
}

function parseFreshnessRow(raw: unknown): EditorialFreshnessRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    raw_term: strField(raw, "raw_term"),
    concept_key: strField(raw, "concept_key"),
    confidence: strField(raw, "confidence"),
    trend_freshness: strField(raw, "trend_freshness"),
    trend_durability: strField(raw, "trend_durability"),
    human_decision: strField(raw, "human_decision"),
    unresolved_age_days_estimate: finiteNum(raw.unresolved_age_days_estimate),
    risk_flags: strArrField(raw, "risk_flags"),
    freshness_score: finiteNum(raw.freshness_score),
    freshness_band: strField(raw, "freshness_band"),
    refresh_note: strField(raw, "refresh_note"),
  };
}

function parseNeedsRefreshRow(raw: unknown): EditorialNeedsRefreshRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    raw_term: strField(raw, "raw_term"),
    concept_key: strField(raw, "concept_key"),
    human_decision: strField(raw, "human_decision"),
    trend_freshness: strField(raw, "trend_freshness"),
    trend_durability: strField(raw, "trend_durability"),
    unresolved_age_days_estimate: finiteNum(raw.unresolved_age_days_estimate),
    risk_flags: strArrField(raw, "risk_flags"),
    refresh_reason: strField(raw, "refresh_reason"),
    severity: strField(raw, "severity"),
    action_note: strField(raw, "action_note"),
  };
}

function parseOverexposureRow(raw: unknown): EditorialOverexposureRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    concept_key: strField(raw, "concept_key"),
    draft_count: finiteNum(raw.draft_count),
    draft_definition_count: finiteNum(raw.draft_definition_count),
    draft_contextual_count: finiteNum(raw.draft_contextual_count),
    dormant_variant_group_count: finiteNum(raw.dormant_variant_group_count),
    dormant_variant_question_count: finiteNum(raw.dormant_variant_question_count),
    saturation_index: finiteNum(raw.saturation_index),
    saturation_risk_band: strField(raw, "saturation_risk_band"),
    review_note: strField(raw, "review_note"),
  };
}

export async function loadEditorialHealthSnapshot(): Promise<{
  data: AdminCockpitEditorialHealth;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/editorial_health.json");
    if (!isPlainObject(raw)) {
      return { data: EMPTY_EDITORIAL_HEALTH, warning: "editorial_health_invalid_shape" };
    }
    const evergreen = raw.safe_evergreen_counts_only;
    return {
      data: {
        generated_at: String(raw.generated_at ?? ""),
        priority_queue: parseEditorialSection(raw.priority_queue, parsePriorityQueueRow),
        freshness: parseEditorialSection(raw.freshness, parseFreshnessRow),
        needs_refresh: parseEditorialSection(raw.needs_refresh, parseNeedsRefreshRow),
        overexposure: parseEditorialSection(raw.overexposure, parseOverexposureRow),
        safe_evergreen_counts_only: {
          total_rows:
            isPlainObject(evergreen) && typeof evergreen.total_rows === "number"
              ? evergreen.total_rows
              : null,
        },
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_EDITORIAL_HEALTH,
      warning: err instanceof Error ? err.message : "editorial_health_unavailable",
    };
  }
}

const PHASE0_SUMMARY_KEYS = [
  "total_attempts",
  "distinct_users_with_attempts",
  "attempt_date_span_days",
  "global_accuracy_percent",
] as const;

function parsePhase0Summary(raw: unknown): Record<string, number> {
  if (!isPlainObject(raw)) return {};
  const out: Record<string, number> = {};
  for (const k of PHASE0_SUMMARY_KEYS) {
    const n = finiteNum(raw[k]);
    if (n !== null) out[k] = n;
  }
  return out;
}

function parseBlindSpots(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x);
    else if (isPlainObject(x) && typeof x.label === "string") out.push(x.label);
    else if (isPlainObject(x) && typeof x.code === "string") out.push(x.code);
  }
  return out;
}

function parseSafety(raw: unknown): Record<string, boolean> {
  if (!isPlainObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => typeof v === "boolean") as [string, boolean][],
  );
}

function parseAnalyticsSummaryInner(raw: unknown): AdminCockpitAnalyticsSummary {
  if (!isPlainObject(raw)) return { ...EMPTY_ANALYTICS_SUMMARY, generated_at: "" };
  const p0 = isPlainObject(raw.phase0) ? raw.phase0 : {};
  const attempts_over_time = Array.isArray(p0.attempts_over_time)
    ? p0.attempts_over_time.filter(isPlainObject).map((r) => ({
        date: strField(r, "date"),
        attempt_count: finiteNum(r.attempt_count),
      }))
    : [];
  const mode_distribution = Array.isArray(p0.mode_distribution)
    ? p0.mode_distribution.filter(isPlainObject).map((r) => ({
        mode: strField(r, "mode"),
        attempt_count: finiteNum(r.attempt_count),
        share_percent: finiteNum(r.share_percent),
      }))
    : [];
  const theme_popularity = Array.isArray(p0.theme_popularity)
    ? p0.theme_popularity.filter(isPlainObject).map((r) => ({
        theme: strField(r, "theme"),
        attempt_count: finiteNum(r.attempt_count),
        share_percent: finiteNum(r.share_percent),
      }))
    : [];
  const accuracy_bands = Array.isArray(p0.accuracy_bands)
    ? p0.accuracy_bands.filter(isPlainObject).map((r) => ({
        band: strField(r, "band"),
        attempt_count: finiteNum(r.attempt_count),
        share_percent: finiteNum(r.share_percent),
      }))
    : [];
  const returning_user_proxy = Array.isArray(p0.returning_user_proxy)
    ? p0.returning_user_proxy.filter(isPlainObject).map((r) => ({
        metric: strField(r, "metric"),
        value: finiteNum(r.value),
      }))
    : [];
  const profiles_summary = Array.isArray(p0.profiles_summary)
    ? p0.profiles_summary
        .filter(isPlainObject)
        .map((r) => ({
          metric: strField(r, "metric"),
          value: finiteNum(r.value),
          dimension: typeof r.dimension === "string" ? r.dimension : "all",
        }))
    : [];

  const p1 = isPlainObject(raw.phase1) ? raw.phase1 : {};
  const starts_vs_completions_by_mode = Array.isArray(p1.starts_vs_completions_by_mode)
    ? p1.starts_vs_completions_by_mode.filter(isPlainObject).map((r) => ({
        mode: strField(r, "mode"),
        starts: finiteNum(r.starts),
        completions: finiteNum(r.completions),
        completion_rate_percent: finiteNum(r.completion_rate_percent),
      }))
    : [];
  const level_pass_fail_summary = Array.isArray(p1.level_pass_fail_summary)
    ? p1.level_pass_fail_summary.filter(isPlainObject).map((r) => ({
        band: strField(r, "band") || strField(r, "outcome"),
        pass: finiteNum(r.pass) ?? finiteNum(r.pass_count),
        fail: finiteNum(r.fail) ?? finiteNum(r.fail_count),
      }))
    : [];
  const marathon_end_distribution = Array.isArray(p1.marathon_end_distribution)
    ? p1.marathon_end_distribution.filter(isPlainObject).map((r) => ({
        correct_band: strField(r, "correct_band"),
        ended_sessions: finiteNum(r.ended_sessions),
      }))
    : [];
  const cta_clickthrough_summary = Array.isArray(p1.cta_clickthrough_summary)
    ? p1.cta_clickthrough_summary.filter(isPlainObject).map((r) => ({
        mode: strField(r, "mode"),
        clicks: finiteNum(r.clicks),
        completions: finiteNum(r.completions),
        click_through_percent: finiteNum(r.click_through_percent),
      }))
    : [];
  const event_volume_by_event_name_mode = Array.isArray(p1.event_volume_by_event_name_mode)
    ? p1.event_volume_by_event_name_mode.filter(isPlainObject).map((r) => ({
        event_name: strField(r, "event_name"),
        mode: strField(r, "mode"),
        count: finiteNum(r.count),
      }))
    : [];
  const data_quality_checks = Array.isArray(p1.data_quality_checks)
    ? p1.data_quality_checks.filter(isPlainObject).map((r) => ({
        metric: strField(r, "metric"),
        value: finiteNum(r.value),
      }))
    : [];

  return {
    generated_at: String(raw.generated_at ?? ""),
    phase0: {
      summary: parsePhase0Summary(p0.summary),
      attempts_over_time,
      mode_distribution,
      theme_popularity,
      accuracy_bands,
      returning_user_proxy,
      profiles_summary,
    },
    phase1: {
      analytics_events_available: Boolean(p1.analytics_events_available),
      analytics_event_count: finiteNum(p1.analytics_event_count),
      starts_vs_completions_by_mode,
      level_pass_fail_summary,
      marathon_end_distribution,
      cta_clickthrough_summary,
      event_volume_by_event_name_mode,
      data_quality_checks,
    },
    blind_spots: parseBlindSpots(raw.blind_spots),
    safety: parseSafety(raw.safety),
  };
}

export async function loadAnalyticsSummarySnapshot(): Promise<{
  data: AdminCockpitAnalyticsSummary;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/analytics_summary.json");
    if (!isPlainObject(raw)) {
      return { data: EMPTY_ANALYTICS_SUMMARY, warning: "analytics_summary_invalid_shape" };
    }
    return { data: parseAnalyticsSummaryInner(raw), warning: null };
  } catch (err) {
    return {
      data: EMPTY_ANALYTICS_SUMMARY,
      warning: err instanceof Error ? err.message : "analytics_summary_unavailable",
    };
  }
}

function parseBatchReviewRow(raw: unknown): BatchReviewRow | null {
  if (!isPlainObject(raw)) return null;
  const qc = finiteNum(raw.question_count);
  return {
    duplicate_group_id: strField(raw, "duplicate_group_id"),
    concept_key: strField(raw, "concept_key"),
    question_count: qc !== null ? Math.max(0, Math.trunc(qc)) : 0,
    difficulty_differences: strField(raw, "difficulty_differences"),
    choice_differences: strField(raw, "choice_differences"),
    explanation_differences: strField(raw, "explanation_differences"),
    category: strField(raw, "category"),
    recommended_action: strField(raw, "recommended_action"),
    reason: strField(raw, "reason"),
    risk_level: strField(raw, "risk_level"),
    archive_only_later: strField(raw, "archive_only_later"),
  };
}

export async function loadBatchReviewsSnapshot(): Promise<{
  data: AdminCockpitBatchReviews;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/batch_reviews.json");
    if (!isPlainObject(raw)) {
      return { data: EMPTY_BATCH_REVIEWS, warning: "batch_reviews_invalid_shape" };
    }
    const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
    const rows: BatchReviewRow[] = [];
    for (const item of rowsRaw) {
      const row = parseBatchReviewRow(item);
      if (row) rows.push(row);
    }
    return {
      data: { generated_at: String(raw.generated_at ?? ""), rows },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_BATCH_REVIEWS,
      warning: err instanceof Error ? err.message : "batch_reviews_unavailable",
    };
  }
}
