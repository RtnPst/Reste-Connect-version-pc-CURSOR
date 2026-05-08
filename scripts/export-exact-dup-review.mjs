/**
 * Read-only: simplified CSV for human review of EXACT duplicate groups only
 * (same normalized question text as PostgreSQL normalize_question_canonical_key).
 *
 * Does NOT modify the database.
 *
 * Requires .env:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/export-exact-dup-review.mjs
 *
 * Outputs:
 *   exports/dedup-audit/exact-dup-review-<timestamp>.csv
 *   exports/dedup-audit/exact-dup-review-latest.csv
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

function pickRecommendedKeep(members) {
  const scored = [...members].sort((a, b) => {
    const score = (r) => {
      let s = 0;
      if (r.status === "live") s += 100;
      if (r.is_active === true) s += 50;
      if (r.status === "review") s += 10;
      if (r.status === "draft") s += 5;
      return s;
    };
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (tb !== ta) return tb - ta;
    return String(a.id).localeCompare(String(b.id));
  });
  return scored[0]?.id ?? null;
}

const KEEP_REASON_YES =
  "Heuristic: prefer live > active > review/draft; then newest created_at; UUID tie-break. Override if another row has quiz/daily refs or better editorial quality.";
const KEEP_REASON_NO =
  "Same normalized question text as siblings — compare choices/explanation before retiring.";

async function fetchAllQuestions(client) {
  const rows = [];
  const pageSize = 500;
  let offset = 0;
  const select =
    "id, question, theme, difficulty, status, is_active, explanation, choices, created_at";
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

  const duplicateGroups = [...byKey.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => {
      const idA = `exact_${shortHash(a[0])}`;
      const idB = `exact_${shortHash(b[0])}`;
      return idA.localeCompare(idB);
    });

  const headers = [
    "duplicate_group_id",
    "group_size",
    "id",
    "question",
    "theme",
    "difficulty",
    "status",
    "is_active",
    "created_at",
    "quiz_attempt_refs",
    "daily_question_refs",
    "recommended_keep",
    "keep_reason",
    "choices_summary",
    "explanation_summary",
    "human_decision",
    "human_notes",
  ];

  const lines = [headers.join(",")];

  let rowsWithRefsInGroups = 0;
  let nonRecommendedWithRefs = 0;

  for (const [normKey, members] of duplicateGroups) {
    const duplicate_group_id = `exact_${shortHash(normKey)}`;
    const recommendedId = pickRecommendedKeep(members);
    const sorted = [...members].sort((a, b) => {
      const ar = a.id === recommendedId ? 0 : 1;
      const br = b.id === recommendedId ? 0 : 1;
      if (ar !== br) return ar - br;
      return String(a.id).localeCompare(String(b.id));
    });

    for (const m of sorted) {
      const qRefs = usage.get(m.id) ?? 0;
      const dRefs = dailyRefs.get(m.id) ?? 0;
      const hasRefs = qRefs > 0 || dRefs > 0;
      if (hasRefs) rowsWithRefsInGroups += 1;
      const isRec = m.id === recommendedId;
      if (hasRefs && !isRec) nonRecommendedWithRefs += 1;

      const row = {
        duplicate_group_id,
        group_size: members.length,
        id: m.id,
        question: m.question,
        theme: m.theme,
        difficulty: m.difficulty,
        status: m.status,
        is_active: m.is_active,
        created_at: m.created_at,
        quiz_attempt_refs: qRefs,
        daily_question_refs: dRefs,
        recommended_keep: isRec ? "yes" : "no",
        keep_reason: isRec ? KEEP_REASON_YES : KEEP_REASON_NO,
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
  const outStamped = join(outDir, `exact-dup-review-${stamp}.csv`);
  const outLatest = join(outDir, "exact-dup-review-latest.csv");
  writeFileSync(outStamped, body, "utf8");
  writeFileSync(outLatest, body, "utf8");

  const groupCount = duplicateGroups.length;
  const totalRows = lines.length - 1;
  const recommendedRows = groupCount;

  const summary = {
    exact_duplicate_groups: groupCount,
    total_csv_rows: totalRows,
    recommended_keep_rows: recommendedRows,
    rows_with_quiz_or_daily_refs: rowsWithRefsInGroups,
    non_recommended_rows_with_refs: nonRecommendedWithRefs,
    outputs: [outStamped, outLatest],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
