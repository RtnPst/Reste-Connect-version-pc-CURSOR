export type CockpitTabId =
  | "overview"
  | "concept_intake"
  | "question_drafts"
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
