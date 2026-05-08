/**
 * Read-only audit: all questions with theme = tech.
 * Does NOT activate rows, migrate themes, or write to the database.
 *
 * Enriches each row with heuristic categories and cross-theme duplicate hints
 * (same DB-normalized question text as non-tech themes).
 *
 * Requires .env:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recommended)
 *
 * Usage:
 *   node scripts/audit-tech-theme-pool.mjs
 *   node scripts/audit-tech-theme-pool.mjs --write-latest
 *
 * Outputs under exports/tech-theme-audit/ (timestamped JSON + CSV).
 * With --write-latest: also copies *-latest.json / *-latest.csv
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { normalizeDbKey, loadEnv, normalizeSupabaseUrl, csvEscape } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/tech-theme-audit");

const AI_KEYWORD_RE =
  /\b(ia\b|i\.a\.|chatgpt|gpt-?\d|openai|anthropic|claude|llm|deepfake|midjourney|stable diffusion|machine learning|apprentissage automatique|intelligence artificielle|gemini|copilot|vpn|métadonnées|cryptomonnaie|blockchain|ransomware|zero\s*day)\b/i;

const OUTDATED_YEAR_RE = /\b20(1[0-9]|20)\b/;

function parseArgs(argv) {
  return { writeLatest: argv.includes("--write-latest") };
}

/** @returns {string[]} */
function categorizeRecord(row, ctx) {
  const norm = normalizeDbKey(row.question);
  const themesOther = ctx.normToThemes.get(norm) ?? new Set();
  const techIdsForNorm = ctx.normToTechIds.get(norm) ?? new Set();
  const dupOtherThemes = [...themesOther].filter((t) => t !== "tech");
  const dupTechSiblings = techIdsForNorm.size > 1;

  const choices = Array.isArray(row.choices) ? row.choices : [];
  const explLen = String(row.explanation ?? "").trim().length;
  const qLen = String(row.question ?? "").trim().length;

  const lowQuality =
    choices.length !== 4 ||
    explLen < 18 ||
    qLen < 8 ||
    row.correct_index == null ||
    row.correct_index < 0 ||
    row.correct_index >= choices.length;

  const duplicateRisk = dupOtherThemes.length > 0 || dupTechSiblings;

  const explQ = `${row.question ?? ""} ${row.explanation ?? ""}`;
  const aiAngle = row.era === "ai" || AI_KEYWORD_RE.test(explQ);

  const outdatedSignal =
    (row.era === "facebook" || row.era === "snapchat") &&
    !aiAngle &&
    !AI_KEYWORD_RE.test(row.question ?? "");

  const staleYear = OUTDATED_YEAR_RE.test(row.explanation ?? "") && !aiAngle;

  /** @type {string[]} */
  const tags = [];
  if (lowQuality) tags.push("low_quality");
  if (duplicateRisk) tags.push("duplicate_or_cross_theme");
  if (outdatedSignal || staleYear) tags.push("outdated_or_stale");
  if (aiAngle) tags.push("ai_focus_or_future");

  if (tags.length === 0) tags.push("likely_good_restore");

  return tags;
}

/** Single primary bucket for sorting/filtering */
function primaryBucket(tags) {
  if (tags.includes("low_quality")) return "low_quality";
  if (tags.includes("duplicate_or_cross_theme")) return "duplicate_suspicious";
  if (tags.includes("outdated_or_stale")) return "outdated";
  if (tags.includes("ai_focus_or_future")) return "ai_pipeline";
  if (tags.includes("likely_good_restore")) return "likely_good";
  return "uncategorized";
}

function restoreEstimate(tags, primary) {
  if (tags.includes("low_quality")) return "keep_archived_until_fixed";
  if (tags.includes("duplicate_or_cross_theme")) return "resolve_duplicate_first";
  if (primary === "outdated") return "review_or_keep_archived";
  if (primary === "ai_pipeline") return "review_then_batch";
  if (primary === "likely_good") return "quick_restore_candidate";
  return "manual_review";
}

async function fetchAllQuestionsMinimal(supabase) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, theme, question")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function fetchTechFull(supabase) {
  const rows = [];
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, question, choices, correct_index, explanation, difficulty, status, theme, is_active, created_at, canonical_key, era, format, context, tone, internet_level, trap_intensity, editor_notes",
      )
      .eq("theme", "tech")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

function buildNormMaps(allMinimal) {
  /** @type {Map<string, Set<string>>} */
  const normToThemes = new Map();
  /** @type {Map<string, Set<string>>} */
  const normToTechIds = new Map();

  for (const r of allMinimal) {
    const n = normalizeDbKey(r.question);
    if (!n) continue;
    if (!normToThemes.has(n)) normToThemes.set(n, new Set());
    normToThemes.get(n).add(r.theme);

    if (r.theme === "tech") {
      if (!normToTechIds.has(n)) normToTechIds.set(n, new Set());
      normToTechIds.get(n).add(r.id);
    }
  }

  return { normToThemes, normToTechIds };
}

async function main() {
  const { writeLatest } = parseArgs(process.argv);
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const key = service || anon;
  if (!url || !key) {
    console.error(
      "Missing env: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (recommended) or publishable key.",
    );
    process.exit(1);
  }
  if (!service) {
    console.warn("[audit-tech-theme] Warning: using publishable key — may hit RLS limits.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("Fetching all questions (id, theme, text) for duplicate map...");
  const allMinimal = await fetchAllQuestionsMinimal(supabase);
  const ctx = buildNormMaps(allMinimal);

  console.log("Fetching tech theme rows (full)...");
  const techRows = await fetchTechFull(supabase);

  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, "-");

  /** @type {Record<string, number>} */
  const bucketCounts = {};
  /** @type {Record<string, number>} */
  const restoreCounts = {};

  const records = techRows.map((row) => {
    const norm = normalizeDbKey(row.question);
    const themesOther = ctx.normToThemes.get(norm) ?? new Set();
    const dupOtherThemes = [...themesOther].filter((t) => t !== "tech").sort();
    const techSiblings = [...(ctx.normToTechIds.get(norm) ?? [])].filter((id) => id !== row.id);

    const categories = categorizeRecord(row, ctx);
    const primary = primaryBucket(categories);
    const restore = restoreEstimate(categories, primary);

    bucketCounts[primary] = (bucketCounts[primary] ?? 0) + 1;
    restoreCounts[restore] = (restoreCounts[restore] ?? 0) + 1;

    return {
      id: row.id,
      question: row.question,
      choices: row.choices,
      correct_index: row.correct_index,
      explanation: row.explanation,
      difficulty: row.difficulty,
      status: row.status,
      is_active: row.is_active,
      created_at: row.created_at,
      canonical_key: row.canonical_key ?? null,
      era: row.era ?? null,
      format: row.format ?? null,
      context: row.context ?? null,
      tone: row.tone ?? null,
      internet_level: row.internet_level ?? null,
      trap_intensity: row.trap_intensity ?? null,
      editor_notes: row.editor_notes ?? null,
      normalized_question_key: norm,
      dup_other_themes: dupOtherThemes.join(";"),
      dup_tech_sibling_ids: techSiblings.join(";"),
      categories: categories.join(";"),
      primary_bucket: primary,
      restore_estimate: restore,
    };
  });

  const playableTech = techRows.filter((r) => r.status === "live" && r.is_active === true).length;
  const summary = {
    exported_at: exportedAt,
    supabase_url_host: (() => {
      try {
        return new URL(url).host;
      } catch {
        return "(parse error)";
      }
    })(),
    total_questions_scanned: allMinimal.length,
    tech_row_count: records.length,
    tech_playable_live_active: playableTech,
    primary_bucket_counts: bucketCounts,
    restore_estimate_counts: restoreCounts,
    notes: [
      "Categories are heuristics for review only — not editorial truth.",
      "duplicate_or_cross_theme: same normalized question text exists in another theme or duplicate tech UUIDs.",
      "quick_restore_candidate rows still require human approval before any activation.",
    ],
  };

  mkdirSync(outDir, { recursive: true });
  const baseName = `tech-theme-audit-${stamp}`;
  const jsonPath = resolve(outDir, `${baseName}.json`);
  const csvPath = resolve(outDir, `${baseName}.csv`);

  const payload = { summary, records };
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
    "canonical_key",
    "era",
    "format",
    "dup_other_themes",
    "dup_tech_sibling_ids",
    "categories",
    "primary_bucket",
    "restore_estimate",
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
        csvEscape(r.canonical_key ?? ""),
        csvEscape(r.era ?? ""),
        csvEscape(r.format ?? ""),
        csvEscape(r.dup_other_themes),
        csvEscape(r.dup_tech_sibling_ids),
        csvEscape(r.categories),
        csvEscape(r.primary_bucket),
        csvEscape(r.restore_estimate),
      ].join(","),
    ),
  ];
  writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log("Wrote:", jsonPath);
  console.log("Wrote:", csvPath);

  if (writeLatest) {
    const jLatest = resolve(outDir, "tech-theme-audit-latest.json");
    const cLatest = resolve(outDir, "tech-theme-audit-latest.csv");
    copyFileSync(jsonPath, jLatest);
    copyFileSync(csvPath, cLatest);
    console.log("Also wrote:", jLatest, cLatest);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
