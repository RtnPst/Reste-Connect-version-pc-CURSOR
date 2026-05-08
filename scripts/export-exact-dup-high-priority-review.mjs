/**
 * Read-only: high-priority subset of exact duplicate groups (needs human attention).
 *
 * Includes only groups where at least one risk trigger fires (see analyzeGroup()).
 * Does NOT modify the database.
 *
 * Triggers include: multiple live/active rows; differing choices / explanations /
 * difficulty; refs on non-recommended rows; heuristic tie at top score; recommended
 * row not holding max combined refs; meaningful canonical_key drift (stored vs
 * computed; trailing " #uuid" on stored keys is ignored as noise).
 *
 * Requires .env:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/export-exact-dup-high-priority-review.mjs
 *
 * Outputs:
 *   exports/dedup-audit/exact-dup-high-priority-review-<timestamp>.csv
 *   exports/dedup-audit/exact-dup-high-priority-review-latest.csv
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/dedup-audit");

function normalizeDbKey(question) {
  const s = String(question ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return s === "" ? null : s;
}

function normalizeExplanationForCompare(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function choicesFingerprint(choices) {
  try {
    return JSON.stringify(choices);
  } catch {
    return String(choices);
  }
}

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

function shortHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function summarizeChoices(choices) {
  try {
    const arr = Array.isArray(choices) ? choices : [];
    const n = arr.length;
    const preview = arr
      .slice(0, 2)
      .map((c) => String(c).replace(/\s+/g, " ").trim())
      .join(" | ");
    let out = `${n} choices: ${preview}`;
    if (out.length > 200) out = `${out.slice(0, 197)}...`;
    return out;
  } catch {
    return String(choices).slice(0, 200);
  }
}

function summarizeExplanation(text, max = 160) {
  const s = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 3)}...`;
}

function heuristicScore(r) {
  let s = 0;
  if (r.status === "live") s += 100;
  if (r.is_active === true) s += 50;
  if (r.status === "review") s += 10;
  if (r.status === "draft") s += 5;
  return s;
}

function pickRecommendedKeep(members) {
  const scored = [...members].sort((a, b) => {
    const ds = heuristicScore(b) - heuristicScore(a);
    if (ds !== 0) return ds;
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (tb !== ta) return tb - ta;
    return String(a.id).localeCompare(String(b.id));
  });
  return scored[0]?.id ?? null;
}

function stripTrailingUuidSuffix(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+#[0-9a-f-]{36}\s*$/i, "")
    .trim();
}

function rowKeyMismatch(row) {
  const computed = normalizeDbKey(row.question);
  if (!computed) return false;
  if (row.canonical_key == null || row.canonical_key === "") return true;
  const stripped = stripTrailingUuidSuffix(row.canonical_key);
  return stripped !== computed;
}

async function fetchAllQuestions(client) {
  const rows = [];
  const pageSize = 500;
  let offset = 0;
  const select =
    "id, question, canonical_key, theme, difficulty, status, is_active, explanation, choices, created_at";
  for (;;) {
    const { data, error } = await client
      .from("questions")
      .select(select)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function fetchQuestionUsageCounts(client) {
  const refs = new Map();
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("quiz_attempts")
      .select("question_ids")
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.warn("[export] quiz_attempts unreadable:", error.message);
      return refs;
    }
    for (const row of data ?? []) {
      for (const qid of row.question_ids ?? []) {
        refs.set(qid, (refs.get(qid) ?? 0) + 1);
      }
    }
    if ((data ?? []).length < pageSize) break;
    offset += pageSize;
  }
  return refs;
}

async function fetchDailyRefs(client) {
  const refs = new Map();
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("daily_questions")
      .select("question_id")
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.warn("[export] daily_questions unreadable:", error.message);
      return refs;
    }
    const batch = data ?? [];
    for (const row of batch) {
      const qid = row.question_id;
      refs.set(qid, (refs.get(qid) ?? 0) + 1);
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return refs;
}

function analyzeGroup(members, usage, dailyRefs, recommendedId) {
  const liveCount = members.filter((m) => m.status === "live").length;
  const activeCount = members.filter((m) => m.is_active === true).length;

  const choiceFp = new Set(members.map((m) => choicesFingerprint(m.choices)));
  const choicesDiffer = choiceFp.size > 1;

  const explNorm = new Set(
    members.map((m) => normalizeExplanationForCompare(m.explanation)),
  );
  const explanationsDiffer = explNorm.size > 1;

  const difficulties = new Set(members.map((m) => m.difficulty));
  const difficultyDiffer = difficulties.size > 1;

  let nonRecQuiz = false;
  let nonRecDaily = false;
  for (const m of members) {
    if (m.id === recommendedId) continue;
    if ((usage.get(m.id) ?? 0) > 0) nonRecQuiz = true;
    if ((dailyRefs.get(m.id) ?? 0) > 0) nonRecDaily = true;
  }

  const scores = members.map(heuristicScore);
  const maxScore = Math.max(...scores, 0);
  const tieAtTop = scores.filter((s) => s === maxScore).length > 1;

  let refsConflict = false;
  let combinedMax = 0;
  let combinedRec = 0;
  for (const m of members) {
    const c = (usage.get(m.id) ?? 0) + (dailyRefs.get(m.id) ?? 0);
    combinedMax = Math.max(combinedMax, c);
  }
  combinedRec =
    (usage.get(recommendedId) ?? 0) + (dailyRefs.get(recommendedId) ?? 0);
  if (combinedMax > 0 && combinedRec < combinedMax) refsConflict = true;

  const canonicalMismatchInGroup = members.some((m) => rowKeyMismatch(m));

  const reasons = [];
  if (liveCount >= 2) reasons.push("multiple_live");
  if (activeCount >= 2) reasons.push("multiple_active");
  if (choicesDiffer) reasons.push("choices_differ");
  if (explanationsDiffer) reasons.push("explanations_differ");
  if (difficultyDiffer) reasons.push("difficulty_differ");
  if (nonRecQuiz) reasons.push("non_recommended_quiz_refs");
  if (nonRecDaily) reasons.push("non_recommended_daily_refs");
  if (tieAtTop) reasons.push("heuristic_tie_ambiguous");
  if (refsConflict) reasons.push("recommended_not_max_refs");
  if (canonicalMismatchInGroup) reasons.push("canonical_key_mismatch");

  let severity = 0;
  if (nonRecDaily) severity += 100;
  if (nonRecQuiz) severity += 90;
  if (liveCount >= 2) severity += 85;
  if (refsConflict) severity += 75;
  if (choicesDiffer || explanationsDiffer) severity += 55;
  if (difficultyDiffer) severity += 50;
  if (activeCount >= 2) severity += 45;
  if (canonicalMismatchInGroup) severity += 35;
  if (tieAtTop) severity += 30;

  return {
    reasons,
    severity,
    flags: {
      multiple_live: liveCount >= 2,
      multiple_active: activeCount >= 2,
      choices_differ: choicesDiffer,
      explanations_differ: explanationsDiffer,
      difficulty_differ: difficultyDiffer,
      non_recommended_quiz_refs: nonRecQuiz,
      non_recommended_daily_refs: nonRecDaily,
      heuristic_tie_ambiguous: tieAtTop,
      recommended_not_max_refs: refsConflict,
      canonical_key_mismatch: canonicalMismatchInGroup,
    },
  };
}

function isHighPriority(analysis) {
  return analysis.reasons.length > 0;
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const [rows, usage, dailyRefs] = await Promise.all([
    fetchAllQuestions(supabase),
    fetchQuestionUsageCounts(supabase),
    fetchDailyRefs(supabase),
  ]);

  /** @type {Map<string, typeof rows>} */
  const byKey = new Map();
  for (const r of rows) {
    const k = normalizeDbKey(r.question);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }

  const duplicateGroups = [...byKey.entries()].filter(
    ([, list]) => list.length > 1,
  );

  /** @type {Array<{ normKey: string, members: typeof rows, groupId: string, analysis: ReturnType<typeof analyzeGroup>, recommendedId: string }>} */
  const highPriority = [];

  for (const [normKey, members] of duplicateGroups) {
    const recommendedId = pickRecommendedKeep(members);
    const analysis = analyzeGroup(members, usage, dailyRefs, recommendedId);
    if (!isHighPriority(analysis)) continue;
    highPriority.push({
      normKey,
      members,
      groupId: `exact_${shortHash(normKey)}`,
      analysis,
      recommendedId,
    });
  }

  highPriority.sort((a, b) => {
    const ds = b.analysis.severity - a.analysis.severity;
    if (ds !== 0) return ds;
    return a.groupId.localeCompare(b.groupId);
  });

  const headers = [
    "duplicate_group_id",
    "id",
    "question",
    "theme",
    "difficulty",
    "status",
    "is_active",
    "quiz_attempt_refs",
    "daily_question_refs",
    "recommended_keep",
    "ambiguity_reason",
    "key_mismatch",
    "choices_summary",
    "explanation_summary",
    "human_decision",
    "human_notes",
  ];

  const lines = [headers.join(",")];

  const categoryCounts = {
    multiple_live: 0,
    multiple_active: 0,
    choices_differ: 0,
    explanations_differ: 0,
    difficulty_differ: 0,
    non_recommended_quiz_refs: 0,
    non_recommended_daily_refs: 0,
    heuristic_tie_ambiguous: 0,
    recommended_not_max_refs: 0,
    canonical_key_mismatch: 0,
  };

  for (const g of highPriority) {
    const f = g.analysis.flags;
    if (f.multiple_live) categoryCounts.multiple_live += 1;
    if (f.multiple_active) categoryCounts.multiple_active += 1;
    if (f.choices_differ) categoryCounts.choices_differ += 1;
    if (f.explanations_differ) categoryCounts.explanations_differ += 1;
    if (f.difficulty_differ) categoryCounts.difficulty_differ += 1;
    if (f.non_recommended_quiz_refs)
      categoryCounts.non_recommended_quiz_refs += 1;
    if (f.non_recommended_daily_refs)
      categoryCounts.non_recommended_daily_refs += 1;
    if (f.heuristic_tie_ambiguous)
      categoryCounts.heuristic_tie_ambiguous += 1;
    if (f.recommended_not_max_refs)
      categoryCounts.recommended_not_max_refs += 1;
    if (f.canonical_key_mismatch) categoryCounts.canonical_key_mismatch += 1;
  }

  const groupReasonBase = (reasons) => reasons.join(" | ");

  for (const g of highPriority) {
    const baseReason = groupReasonBase(g.analysis.reasons);
    const sorted = [...g.members].sort((a, b) => {
      const ar = a.id === g.recommendedId ? 0 : 1;
      const br = b.id === g.recommendedId ? 0 : 1;
      if (ar !== br) return ar - br;
      return String(a.id).localeCompare(String(b.id));
    });

    for (const m of sorted) {
      const isRec = m.id === g.recommendedId;
      const km = rowKeyMismatch(m);
      const ambiguity_reason =
        baseReason + (km ? " | row_canonical_key_mismatch" : "");

      const row = {
        duplicate_group_id: g.groupId,
        id: m.id,
        question: m.question,
        theme: m.theme,
        difficulty: m.difficulty,
        status: m.status,
        is_active: m.is_active,
        quiz_attempt_refs: usage.get(m.id) ?? 0,
        daily_question_refs: dailyRefs.get(m.id) ?? 0,
        recommended_keep: isRec ? "yes" : "no",
        ambiguity_reason,
        key_mismatch: km ? "yes" : "no",
        choices_summary: summarizeChoices(m.choices),
        explanation_summary: summarizeExplanation(m.explanation),
        human_decision: "",
        human_notes: "",
      };
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });
  const body = lines.join("\n");
  const outStamped = join(outDir, `exact-dup-high-priority-review-${stamp}.csv`);
  const outLatest = join(outDir, "exact-dup-high-priority-review-latest.csv");
  writeFileSync(outStamped, body, "utf8");
  writeFileSync(outLatest, body, "utf8");

  const totalRows = lines.length - 1;
  const groupCount = highPriority.length;

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([, n]) => n > 0);

  const reviewFirst = highPriority.slice(0, Math.min(12, highPriority.length)).map((g) => ({
    duplicate_group_id: g.groupId,
    severity: g.analysis.severity,
    reasons: g.analysis.reasons,
  }));

  const summary = {
    total_exact_duplicate_groups: duplicateGroups.length,
    high_priority_groups: groupCount,
    groups_excluded_lower_priority: duplicateGroups.length - groupCount,
    total_csv_rows: totalRows,
    category_counts_among_groups: categoryCounts,
    categories_sorted_by_frequency: Object.fromEntries(sortedCategories),
    review_first_hint: reviewFirst,
    outputs: [outStamped, outLatest],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
