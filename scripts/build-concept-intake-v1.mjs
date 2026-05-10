/**
 * Concept Intake v1 (review-only, local-first).
 *
 * Inputs:
 *   scripts/data/concept-intake-raw-signals-v1.json
 *
 * Optional collision sources (if present):
 *   exports/dedup-audit/concept-key-backfill-preview-latest.csv       (new_concept_key)
 *   exports/dedup-audit/concept-key-group-review-latest.csv           (final_recommended_concept_key)
 *   exports/dedup-audit/concept-key-suggestions-latest.csv            (concept_key_suggested)
 *
 * Outputs:
 *   exports/dedup-audit/concept-intake-v1-review-<stamp>.csv
 *   exports/dedup-audit/concept-intake-v1-review-latest.csv
 *   exports/dedup-audit/concept-intake-v1-review-<stamp>.json
 *   exports/dedup-audit/concept-intake-v1-review-latest.json
 *
 * Usage:
 *   node scripts/build-concept-intake-v1.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");
const inputPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");

const collisionCsvInputs = [
  {
    path: resolve(root, "exports/dedup-audit/concept-key-backfill-preview-latest.csv"),
    field: "new_concept_key",
  },
  {
    path: resolve(root, "exports/dedup-audit/concept-key-group-review-latest.csv"),
    field: "final_recommended_concept_key",
  },
  {
    path: resolve(root, "exports/dedup-audit/concept-key-suggestions-latest.csv"),
    field: "concept_key_suggested",
  },
];

function stripDiacritics(input) {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toConceptSlug(input) {
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/['’`]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "_");
  s = s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return s;
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadCsvRows(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n");
  if (lines.length <= 1) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function normalizedBigrams(s) {
  const v = ` ${toConceptSlug(s).replace(/_/g, " ")} `;
  const set = new Set();
  for (let i = 0; i < v.length - 1; i += 1) {
    set.add(v.slice(i, i + 2));
  }
  return set;
}

function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  const sa = normalizedBigrams(a);
  const sb = normalizedBigrams(b);
  if (!sa.size || !sb.size) return 0;
  let overlap = 0;
  for (const token of sa) {
    if (sb.has(token)) overlap += 1;
  }
  return (2 * overlap) / (sa.size + sb.size);
}

function suggestTheme(rawTerm) {
  const t = String(rawTerm ?? "").toLowerCase();
  if (/(patch|meta|nerf|buff|skin|speedrun|aim|fps|moba|rpg|ranked)/.test(t)) return "gaming";
  if (/(ratio|dm|story|fyp|viral|comment|meme|brainrot|delulu|stan|ship)/.test(t))
    return "reseaux_sociaux";
  if (/(app|ai|bot|cloud|prompt|captcha|wifi|vpn|api|bug)/.test(t)) return "tech";
  if (/(crush|ghost|situationship|breadcrumb|lovebomb)/.test(t)) return "relations_lifestyle";
  return "culture_pop";
}

function suggestDifficultyBand(rawTerm) {
  const t = String(rawTerm ?? "").toLowerCase();
  if (/(brainrot|mog|aura farming|ratio|cooked|delulu)/.test(t)) return "facile_to_moyen";
  if (t.length >= 18) return "moyen_to_difficile";
  return "moyen";
}

function defaultDefinition(rawTerm) {
  return `Définition à valider pour « ${rawTerm} » (draft local).`;
}

function defaultExample(rawTerm) {
  return `Exemple à valider: « Ce post est ${rawTerm}. »`;
}

function suggestDurability(entry) {
  if (entry.trend_durability) return String(entry.trend_durability);
  const t = String(entry.raw_term ?? "").toLowerCase();
  if (/(meme|brainrot|delulu|mog|cooked)/.test(t)) return "micro_trend";
  return "seasonal";
}

function suggestFreshness(entry) {
  if (entry.trend_freshness) return String(entry.trend_freshness);
  return "to_review";
}

function loadExistingConceptKeys() {
  const keys = new Set();
  for (const src of collisionCsvInputs) {
    for (const row of loadCsvRows(src.path)) {
      const key = toConceptSlug(row[src.field] ?? "");
      if (key) keys.add(key);
    }
  }
  return [...keys].sort();
}

function buildCollisionChecks(suggestedKey, existingKeys) {
  const exact = existingKeys.includes(suggestedKey);
  let bestNear = "";
  let bestNearScore = 0;
  for (const key of existingKeys) {
    if (key === suggestedKey) continue;
    const score = diceSimilarity(suggestedKey, key);
    if (score > bestNearScore) {
      bestNear = key;
      bestNearScore = score;
    }
  }
  const near =
    bestNear && bestNearScore >= 0.7
      ? { key: bestNear, score: Number(bestNearScore.toFixed(3)) }
      : null;
  const semantic =
    near && bestNearScore >= 0.82
      ? { key: bestNear, reason: "high_string_similarity" }
      : null;
  return { exact, near, semantic };
}

function confidenceFor(entry, collision, riskFlags) {
  if (collision.exact || collision.semantic) return "low";
  if (riskFlags.length >= 2) return "low";
  if (entry.short_definition || entry.example_usage) return "medium";
  return "medium";
}

function ensureInputTemplate() {
  if (existsSync(inputPath)) return;
  mkdirSync(dirname(inputPath), { recursive: true });
  const seed = {
    generated_for: "concept_intake_v1_manual_seed",
    notes: "Edit this file manually. Keep it local. No DB writes.",
    raw_signals: [
      { raw_term: "aura farming" },
      { raw_term: "cooked" },
      { raw_term: "mog" },
      { raw_term: "delulu" },
      { raw_term: "brainrot" },
    ],
  };
  writeFileSync(inputPath, JSON.stringify(seed, null, 2), "utf8");
}

function main() {
  ensureInputTemplate();
  if (!existsSync(inputPath)) {
    console.error("Missing input:", inputPath);
    process.exit(1);
  }

  const inputDoc = JSON.parse(readFileSync(inputPath, "utf8"));
  const rawSignals = Array.isArray(inputDoc.raw_signals) ? inputDoc.raw_signals : [];
  if (!rawSignals.length) {
    console.error("No raw_signals found in input:", inputPath);
    process.exit(1);
  }

  const existingConceptKeys = loadExistingConceptKeys();
  const rows = [];

  for (const entry of rawSignals) {
    const rawTerm = String(entry.raw_term ?? "").trim();
    if (!rawTerm) continue;

    const suggestedConceptKey = toConceptSlug(entry.suggested_concept_key ?? rawTerm);
    const suggestedTheme = entry.suggested_theme ?? suggestTheme(rawTerm);
    const suggestedDifficultyBand =
      entry.suggested_difficulty_band ?? suggestDifficultyBand(rawTerm);
    const shortDefinition = String(entry.short_definition ?? defaultDefinition(rawTerm));
    const aliasesArr = Array.isArray(entry.aliases)
      ? entry.aliases
      : String(entry.aliases ?? "")
          .split(/[;,|]/)
          .map((v) => v.trim())
          .filter(Boolean);
    const aliases = aliasesArr.join("; ");
    const exampleUsage = String(entry.example_usage ?? defaultExample(rawTerm));
    const trendFreshness = suggestFreshness(entry);
    const trendDurability = suggestDurability(entry);

    const collision = buildCollisionChecks(suggestedConceptKey, existingConceptKeys);

    const riskFlags = [];
    if (collision.exact) riskFlags.push("exact_concept_key_match");
    if (collision.near) riskFlags.push("near_existing_concept_key");
    if (collision.semantic) riskFlags.push("possible_semantic_duplicate");
    if (!entry.short_definition) riskFlags.push("definition_needs_review");
    if (!entry.example_usage) riskFlags.push("example_usage_needs_review");
    if (suggestedConceptKey.length <= 3) riskFlags.push("short_concept_key_len");
    if (trendDurability === "micro_trend") riskFlags.push("micro_trend_volatility");

    const confidence = confidenceFor(entry, collision, riskFlags);

    rows.push({
      raw_term: rawTerm,
      suggested_concept_key: suggestedConceptKey,
      suggested_theme: suggestedTheme,
      suggested_difficulty_band: suggestedDifficultyBand,
      short_definition: shortDefinition,
      aliases,
      example_usage: exampleUsage,
      trend_freshness: trendFreshness,
      trend_durability: trendDurability,
      confidence,
      risk_flags: riskFlags.join("; "),
      duplicate_check_exact_concept_key_match: collision.exact ? "yes" : "no",
      duplicate_check_near_existing_concept_key: collision.near
        ? `${collision.near.key} (${collision.near.score})`
        : "",
      duplicate_check_possible_semantic_duplicate: collision.semantic
        ? `${collision.semantic.key} (${collision.semantic.reason})`
        : "",
      human_decision: "",
      human_notes: "",
    });
  }

  rows.sort((a, b) => a.raw_term.localeCompare(b.raw_term));
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const headers = [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "suggested_difficulty_band",
    "short_definition",
    "aliases",
    "example_usage",
    "trend_freshness",
    "trend_durability",
    "confidence",
    "risk_flags",
    "duplicate_check_exact_concept_key_match",
    "duplicate_check_near_existing_concept_key",
    "duplicate_check_possible_semantic_duplicate",
    "human_decision",
    "human_notes",
  ];
  const csvBody = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ].join("\n");

  const csvStamped = join(outDir, `concept-intake-v1-review-${stamp}.csv`);
  const csvLatest = join(outDir, "concept-intake-v1-review-latest.csv");
  writeFileSync(csvStamped, csvBody, "utf8");
  writeFileSync(csvLatest, csvBody, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "concept_intake_v1_review_only",
    input_path: "scripts/data/concept-intake-raw-signals-v1.json",
    rows_in_review: rows.length,
    existing_concept_keys_indexed: existingConceptKeys.length,
    confidence_breakdown: rows.reduce((acc, row) => {
      acc[row.confidence] = (acc[row.confidence] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: {
      review_csv: [csvStamped, csvLatest],
    },
    no_db_writes: true,
    no_imports: true,
    no_question_generation: true,
  };

  const jsonPayload = {
    summary,
    rows,
    existing_concept_keys_sample: existingConceptKeys.slice(0, 200),
  };
  const jsonStamped = join(outDir, `concept-intake-v1-review-${stamp}.json`);
  const jsonLatest = join(outDir, "concept-intake-v1-review-latest.json");
  writeFileSync(jsonStamped, JSON.stringify(jsonPayload, null, 2), "utf8");
  writeFileSync(jsonLatest, JSON.stringify(jsonPayload, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main();

