/**
 * Export read-only: all Supabase questions with theme = culture_pop, enriched for remap review.
 * Does NOT migrate themes, enums, or any database writes.
 *
 * Requires in .env (project root):
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY  — recommended (bypasses RLS, full read like import script)
 *
 * Optional: falls back to VITE_SUPABASE_PUBLISHABLE_KEY if service role missing (may fail
 * under RLS depending on your policies — then use service role).
 *
 * Usage:
 *   node scripts/export-culture-pop-pool.mjs
 *
 * Outputs (timestamped):
 *   exports/culture-pop-pool/culture-pop-pool-export-<ISO>.json
 *   exports/culture-pop-pool/culture-pop-pool-export-<ISO>.csv
 *
 * Joins tag piste from src/data/culture-pop-question-tags.json using the same normalization
 * as the app (trim + lower + collapse whitespace).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const tagsPath = resolve(root, "src/data/culture-pop-question-tags.json");
const outDir = resolve(root, "exports/culture-pop-pool");

const PISTE_TO_BASELINE = {
  gaming: "gaming",
  musique: "trends_pop_culture",
  internet: "trends_pop_culture",
  relations: "relations_lifestyle",
};

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

function normalizeQuestionKey(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

/** Map normalized question text -> { piste, sourceKey } */
function buildTagLookup(tagsJson) {
  const map = new Map();
  const duplicates = [];
  for (const [questionKey, piste] of Object.entries(tagsJson)) {
    const n = normalizeQuestionKey(questionKey);
    if (map.has(n)) duplicates.push(n);
    map.set(n, { piste: String(piste), sourceKey: questionKey });
  }
  return { map, duplicates };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const key = service || anon;
  if (!url || !key) {
    console.error(
      "Missing env: need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (recommended) or publishable key.",
    );
    process.exit(1);
  }
  if (!service) {
    console.warn(
      "[export-culture-pop-pool] Warning: SUPABASE_SERVICE_ROLE_KEY not set; using publishable key — may hit RLS limits.",
    );
  }

  if (!existsSync(tagsPath)) {
    console.error("Missing tags file:", tagsPath);
    process.exit(1);
  }
  const tagsJson = JSON.parse(readFileSync(tagsPath, "utf8"));
  const { map: tagByNormalized, duplicates } = buildTagLookup(tagsJson);
  if (duplicates.length > 0) {
    console.warn(
      "[export-culture-pop-pool] Duplicate normalized keys in tags JSON (last wins):",
      duplicates.length,
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = [];
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, question, choices, correct_index, explanation, difficulty, status, theme, is_active, created_at",
      )
      .eq("theme", "culture_pop")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Supabase error:", error.message);
      process.exit(1);
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, "-");

  const records = rows.map((row) => {
    const nq = normalizeQuestionKey(row.question);
    const tagHit = tagByNormalized.get(nq) ?? null;
    const tag_piste = tagHit?.piste ?? null;
    const tag_json_key = tagHit?.sourceKey ?? null;

    let baseline_suggested_theme = "";
    let needs_review = true;
    let review_reason = "no_tag_match";

    if (tag_piste && Object.prototype.hasOwnProperty.call(PISTE_TO_BASELINE, tag_piste)) {
      baseline_suggested_theme = PISTE_TO_BASELINE[tag_piste];
      needs_review = false;
      review_reason = "";
    } else if (tag_piste) {
      review_reason = "unknown_piste_value";
    }

    return {
      id: row.id,
      question: row.question,
      choices: row.choices,
      correct_index: row.correct_index,
      explanation: row.explanation,
      difficulty: row.difficulty,
      status: row.status ?? "",
      is_active: row.is_active,
      created_at: row.created_at,
      theme_current: row.theme,
      tag_piste,
      tag_json_key,
      tag_match_method: tagHit ? "normalized_question" : "none",
      baseline_suggested_theme,
      needs_review,
      review_reason,
      human_approved_theme: "",
      human_notes: "",
    };
  });

  const unmatched = records.filter((r) => r.needs_review).length;
  const summary = {
    exported_at: exportedAt,
    supabase_url_host: (() => {
      try {
        return new URL(url).host;
      } catch {
        return "(parse error)";
      }
    })(),
    row_count: records.length,
    tag_file_path: "src/data/culture-pop-question-tags.json",
    needs_review_count: unmatched,
    baseline_mapping: PISTE_TO_BASELINE,
  };

  const payload = { summary, records };

  mkdirSync(outDir, { recursive: true });
  const baseName = `culture-pop-pool-export-${stamp}`;
  const jsonPath = resolve(outDir, `${baseName}.json`);
  const csvPath = resolve(outDir, `${baseName}.csv`);

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const csvHeaders = [
    "id",
    "question",
    "choices_json",
    "correct_index",
    "explanation",
    "difficulty",
    "status",
    "is_active",
    "created_at",
    "tag_piste",
    "tag_json_key",
    "tag_match_method",
    "baseline_suggested_theme",
    "needs_review",
    "review_reason",
    "human_approved_theme",
    "human_notes",
  ];

  const csvLines = [
    csvHeaders.join(","),
    ...records.map((r) =>
      [
        r.id,
        csvEscape(r.question),
        csvEscape(JSON.stringify(r.choices)),
        r.correct_index,
        csvEscape(r.explanation),
        csvEscape(r.difficulty),
        csvEscape(r.status),
        r.is_active,
        csvEscape(r.created_at),
        csvEscape(r.tag_piste ?? ""),
        csvEscape(r.tag_json_key ?? ""),
        csvEscape(r.tag_match_method),
        csvEscape(r.baseline_suggested_theme),
        r.needs_review ? "true" : "false",
        csvEscape(r.review_reason),
        csvEscape(r.human_approved_theme),
        csvEscape(r.human_notes),
      ].join(","),
    ),
  ];
  writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  console.log("Export OK");
  console.log("  JSON:", jsonPath);
  console.log("  CSV: ", csvPath);
  console.log("  Rows:", records.length, "| needs_review:", unmatched);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
