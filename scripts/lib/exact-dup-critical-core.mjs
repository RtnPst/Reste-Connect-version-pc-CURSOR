/**
 * Shared read-only helpers for exact duplicate "critical" exports (refs-risk groups).
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export function normalizeDbKey(question) {
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

export function loadEnv(path) {
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

export function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

export function shortHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

export function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function summarizeChoices(choices) {
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

export function summarizeExplanation(text, max = 160) {
  const s = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 3)}...`;
}

export function fullChoicesJson(choices) {
  try {
    return JSON.stringify(choices);
  } catch {
    return String(choices);
  }
}

function heuristicScore(r) {
  let s = 0;
  if (r.status === "live") s += 100;
  if (r.is_active === true) s += 50;
  if (r.status === "review") s += 10;
  if (r.status === "draft") s += 5;
  return s;
}

export function pickRecommendedKeep(members) {
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

export async function fetchAllQuestions(client) {
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

export async function fetchQuestionUsageCounts(client) {
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

export async function fetchDailyRefs(client) {
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
    for (const row of data ?? []) {
      const qid = row.question_id;
      refs.set(qid, (refs.get(qid) ?? 0) + 1);
    }
    if ((data ?? []).length < pageSize) break;
    offset += pageSize;
  }
  return refs;
}

export function analyzeGroup(members, usage, dailyRefs, recommendedId) {
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
  for (const m of members) {
    const c = (usage.get(m.id) ?? 0) + (dailyRefs.get(m.id) ?? 0);
    combinedMax = Math.max(combinedMax, c);
  }
  const combinedRec =
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

export function isCritical(flags) {
  return (
    flags.non_recommended_daily_refs ||
    flags.non_recommended_quiz_refs ||
    flags.recommended_not_max_refs
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function buildCriticalExportData(supabase) {
  const [rows, usage, dailyRefs] = await Promise.all([
    fetchAllQuestions(supabase),
    fetchQuestionUsageCounts(supabase),
    fetchDailyRefs(supabase),
  ]);

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

  const criticalGroups = [];

  for (const [normKey, members] of duplicateGroups) {
    const recommendedId = pickRecommendedKeep(members);
    const analysis = analyzeGroup(members, usage, dailyRefs, recommendedId);
    if (!isCritical(analysis.flags)) continue;
    criticalGroups.push({
      normKey,
      members,
      groupId: `exact_${shortHash(normKey)}`,
      analysis,
      recommendedId,
    });
  }

  criticalGroups.sort((a, b) => {
    const ds = b.analysis.severity - a.analysis.severity;
    if (ds !== 0) return ds;
    return a.groupId.localeCompare(b.groupId);
  });

  return {
    criticalGroups,
    duplicateGroupCount: duplicateGroups.length,
    usage,
    dailyRefs,
  };
}
