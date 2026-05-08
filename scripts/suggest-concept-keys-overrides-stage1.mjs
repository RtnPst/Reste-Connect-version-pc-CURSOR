/**
 * Stage 1 review-only helper: concept_key suggestion overrides.
 *
 * Reads:
 *   exports/dedup-audit/concept-key-suggestions-latest.csv
 *
 * Flags suspiciously short / misleading concept_key suggestions and proposes an
 * expanded candidate when possible.
 *
 * Outputs (review only):
 *   exports/dedup-audit/concept-key-suggestions-override-flags-<stamp>.csv
 *   exports/dedup-audit/concept-key-suggestions-override-flags-latest.csv
 *
 * No DB updates.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inPath = resolve(root, "exports/dedup-audit/concept-key-suggestions-latest.csv");
const outDir = resolve(root, "exports/dedup-audit");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes: "" inside quoted cells.
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toLowerAsciiSafe(s) {
  return String(s ?? "").toLowerCase();
}

function getColumns(header) {
  const map = new Map();
  for (let i = 0; i < header.length; i++) map.set(header[i], i);
  return map;
}

function extractFirstQuotedRoot(questionPreview) {
  const q = String(questionPreview ?? "").trim();
  if (!q) return null;
  // Only treat real quote delimiters as quotes.
  // We intentionally exclude apostrophes to avoid matching: qu'est-ce...
  const m = q.match(/["“”«»]([^"“”«»]{1,80})["“”«»]/);
  return m?.[1] ?? null;
}

function computeOverride(row) {
  const conceptKey = String(row.concept_key_suggested ?? "").trim();
  const suggestionReason = String(row.suggestion_reason ?? "");
  const questionPreview = String(row.question_preview ?? "");

  const issueTypes = [];

  if (!conceptKey) return { issueTypes: ["missing_concept_key_suggested"], suggestedOverride: "", overrideReason: "" };

  // If derived from a quoted root, check if the root looks generic/adjectival.
  const isQuotedRootSuggestion = /quoted_root/i.test(suggestionReason);
  const quotedRoot = isQuotedRootSuggestion ? extractFirstQuotedRoot(questionPreview) : null;

  const quotedRootLower = quotedRoot ? toLowerAsciiSafe(quotedRoot) : "";
  const isAcronymQuotedRoot = Boolean(quotedRoot && /^[A-Z0-9]{2,6}$/.test(quotedRoot));
  const commonGenericWords = new Set([
    // French short descriptors
    "fort",
    "faible",
    "moyen",
    "mid",
    "cool",
    // English common descriptors (if present)
    "strong",
    "weak",
    "average",
  ]);

  const probablyGeneric =
    isQuotedRootSuggestion &&
    commonGenericWords.has(quotedRootLower);

  // Flag short keys, but don't spam for clear acronyms like POV/VPN.
  if (!isAcronymQuotedRoot && conceptKey.length <= 4) {
    issueTypes.push("short_concept_key_len");
  }

  if (probablyGeneric) issueTypes.push("quoted_root_generic_common_word");

  // Rule-based expansion candidates.
  let suggestedOverride = "";
  let overrideReason = "";

  // Example you gave:
  // "Qu'est-ce qu'un mot de passe "fort" ?" -> mot_de_passe_fort
  if (/mot\s+de\s+passe/i.test(questionPreview) && conceptKey && /^[a-z0-9_]+$/.test(conceptKey)) {
    // Only expand if conceptKey is short/generic.
    if (conceptKey.length <= 6) {
      suggestedOverride = `mot_de_passe_${conceptKey}`;
      overrideReason = "mot_de_passe_context_expand_from_descriptor";
      issueTypes.push("expanded_from_mot_de_passe_context");
    }
  }

  // If we didn't propose an override, keep override fields empty.
  if (!suggestedOverride) {
    suggestedOverride = "";
    overrideReason = "";
  }

  // Only emit when something is worth reviewing.
  const shouldFlag = issueTypes.length > 0 && (suggestedOverride || issueTypes.length > 0);
  return { issueTypes, suggestedOverride, overrideReason, shouldFlag };
}

function main() {
  if (!existsSync(inPath)) {
    console.error("Missing input:", inPath);
    process.exit(1);
  }

  const raw = readFileSync(inPath, "utf8").trimEnd();
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    console.error("Input CSV seems empty:", inPath);
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]).map((s) => String(s).trim());
  const idx = getColumns(header);

  const required = [
    "duplicate_group_id",
    "question_id",
    "concept_key_suggested",
    "suggestion_reason",
    "question_preview",
  ];
  for (const c of required) {
    if (!idx.has(c)) {
      console.error(`Missing required column: ${c}`);
      process.exit(1);
    }
  }

  const flagged = [];
  const issueTypeCounts = new Map();

  for (let i = 1; i < lines.length; i++) {
    const rowCells = parseCsvLine(lines[i]);
    const get = (col) => rowCells[idx.get(col)] ?? "";

    const row = {
      duplicate_group_id: get("duplicate_group_id"),
      question_id: get("question_id"),
      concept_key_suggested: get("concept_key_suggested"),
      suggestion_reason: get("suggestion_reason"),
      question_preview: get("question_preview"),
    };

    const res = computeOverride(row);
    if (!res.shouldFlag) continue;

    for (const it of res.issueTypes) issueTypeCounts.set(it, (issueTypeCounts.get(it) ?? 0) + 1);

    flagged.push({
      duplicate_group_id: row.duplicate_group_id,
      question_id: row.question_id,
      concept_key_suggested: row.concept_key_suggested,
      suggestion_reason: row.suggestion_reason,
      question_preview: row.question_preview,
      issue_types: res.issueTypes.join(";"),
      suggested_override_concept_key: res.suggestedOverride,
      override_reason: res.overrideReason,
    });
  }

  // Emit only flagged rows for human review.
  flagged.sort((a, b) => a.duplicate_group_id.localeCompare(b.duplicate_group_id) || a.question_id.localeCompare(b.question_id));

  const headersOut = [
    "duplicate_group_id",
    "question_id",
    "concept_key_suggested",
    "suggestion_reason",
    "question_preview",
    "issue_types",
    "suggested_override_concept_key",
    "override_reason",
  ];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });
  const csvStamped = join(outDir, `concept-key-suggestions-override-flags-${stamp}.csv`);
  const csvLatest = join(outDir, `concept-key-suggestions-override-flags-latest.csv`);

  const body = [
    headersOut.join(","),
    ...flagged.map((r) =>
      headersOut.map((h) => csvEscape(r[h] ?? "")).join(","),
    ),
  ].join("\n");

  writeFileSync(csvStamped, body, "utf8");
  writeFileSync(csvLatest, body, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "concept_key_stage1_override_flags_preview_only",
    flagged_rows: flagged.length,
    issue_type_counts: Object.fromEntries([...issueTypeCounts.entries()].sort((a, b) => b[1] - a[1])),
    notes: [
      "Heuristics only; override proposals are conservative and rule-based.",
      "Most rows remain untouched; review CSV is the gate before any DB backfill.",
    ],
    outputs: { csvStamped, csvLatest },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();

