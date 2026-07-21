/**
 * Concept Intake v1.2 (review-only, local-first).
 *
 * Inputs:
 *   scripts/data/concept-intake-raw-signals-v1.json
 *
 * Novelty index (preferred):
 *   exports/foundation/concept-novelty-index-latest.json
 *   (build with: npm run audit:concept-novelty)
 *
 * Outputs:
 *   exports/dedup-audit/concept-intake-v1-review-latest.{csv,json}
 *
 * Usage:
 *   node scripts/build-concept-intake-v1.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNoveltyIndex,
  collisionAgainstIndex,
  scoreAuthenticity,
  toConceptSlug,
} from "./lib/concept-pipeline-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");
const inputPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");
const noveltyPath = resolve(root, "exports/foundation/concept-novelty-index-latest.json");

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function suggestTheme(rawTerm) {
  const t = String(rawTerm ?? "").toLowerCase();
  if (/(patch|meta|nerf|buff|skin|speedrun|aim|fps|moba|rpg|ranked)/.test(t)) return "gaming";
  if (/(ratio|dm|story|fyp|viral|comment|meme|brainrot|delulu|stan|ship|rizz|slay)/.test(t))
    return "reseaux_sociaux";
  if (/(app|ai|bot|cloud|prompt|captcha|wifi|vpn|api|bug)/.test(t)) return "tech";
  if (/(crush|ghost|situationship|breadcrumb|lovebomb|red flag)/.test(t))
    return "relations_lifestyle";
  return "culture_pop";
}

function suggestDifficultyBand(rawTerm) {
  const t = String(rawTerm ?? "").toLowerCase();
  if (/(brainrot|mog|aura farming|ratio|cooked|delulu|rizz)/.test(t)) return "facile_to_moyen";
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

function confidenceFor(entry, collision, riskFlags, authGate) {
  if (collision.exact || collision.semantic) return "low";
  if (authGate === "block_drafts") return "low";
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

async function loadExistingConceptKeys() {
  if (existsSync(noveltyPath)) {
    const doc = JSON.parse(readFileSync(noveltyPath, "utf8"));
    if (Array.isArray(doc.keys) && doc.keys.length) {
      return { keys: doc.keys, source: "novelty_index" };
    }
  }
  const index = await buildNoveltyIndex({ fetchLive: true });
  writeFileSync(noveltyPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return { keys: index.keys, source: "novelty_index_built_inline" };
}

async function main() {
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

  const { keys: existingConceptKeys, source: keySource } = await loadExistingConceptKeys();
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

    const collision = collisionAgainstIndex(suggestedConceptKey, existingConceptKeys);
    const auth = scoreAuthenticity({
      raw_term: rawTerm,
      example_usage: entry.example_usage ? exampleUsage : "",
      short_definition: entry.short_definition ? shortDefinition : "",
      trend_durability: trendDurability,
    });

    const riskFlags = [];
    if (collision.exact) riskFlags.push("exact_concept_key_match");
    if (collision.near) riskFlags.push("near_existing_concept_key");
    if (collision.semantic) riskFlags.push("possible_semantic_duplicate");
    if (!entry.short_definition) riskFlags.push("definition_needs_review");
    if (!entry.example_usage) riskFlags.push("example_usage_needs_review");
    if (suggestedConceptKey.length <= 3) riskFlags.push("short_concept_key_len");
    if (trendDurability === "micro_trend") riskFlags.push("micro_trend_volatility");
    if (auth.authenticity_gate === "block_drafts") riskFlags.push("authenticity_block_drafts");
    if (auth.authenticity_flags) {
      for (const f of auth.authenticity_flags.split(";").map((x) => x.trim()).filter(Boolean)) {
        if (!riskFlags.includes(f)) riskFlags.push(f);
      }
    }

    const confidence = confidenceFor(entry, collision, riskFlags, auth.authenticity_gate);

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
      authenticity_gate: auth.authenticity_gate,
      suggested_usage_vitality: auth.suggested_usage_vitality,
      novelty_status: collision.exact ? "already_known" : "novel_candidate",
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
    "authenticity_gate",
    "suggested_usage_vitality",
    "novelty_status",
    "duplicate_check_exact_concept_key_match",
    "duplicate_check_near_existing_concept_key",
    "duplicate_check_possible_semantic_duplicate",
    "human_decision",
    "human_notes",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ].join("\n");

  const jsonDoc = {
    generated_at: new Date().toISOString(),
    policy: "concept_intake_v1_2_novelty_authenticity",
    novelty_key_source: keySource,
    novelty_key_count: existingConceptKeys.length,
    count: rows.length,
    novel_count: rows.filter((r) => r.novelty_status === "novel_candidate").length,
    rows,
  };

  writeFileSync(join(outDir, `concept-intake-v1-review-${stamp}.csv`), `${csv}\n`, "utf8");
  writeFileSync(join(outDir, "concept-intake-v1-review-latest.csv"), `${csv}\n`, "utf8");
  writeFileSync(
    join(outDir, `concept-intake-v1-review-${stamp}.json`),
    `${JSON.stringify(jsonDoc, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "concept-intake-v1-review-latest.json"),
    `${JSON.stringify(jsonDoc, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        count: rows.length,
        novel_count: jsonDoc.novel_count,
        novelty_key_source: keySource,
        novelty_key_count: existingConceptKeys.length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
