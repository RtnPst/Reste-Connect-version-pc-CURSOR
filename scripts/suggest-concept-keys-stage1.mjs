/**
 * Stage 1 concept_key suggestion generator (preview only, no DB writes).
 *
 * Source:
 *   exports/dedup-audit/dedup-audit-latest.json
 *
 * Outputs:
 *   exports/dedup-audit/concept-key-suggestions-<stamp>.csv
 *   exports/dedup-audit/concept-key-suggestions-latest.csv
 *   exports/dedup-audit/concept-key-suggestions-<stamp>.json
 *   exports/dedup-audit/concept-key-suggestions-latest.json
 *
 * Usage:
 *   node scripts/suggest-concept-keys-stage1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inPath = resolve(root, "exports/dedup-audit/dedup-audit-latest.json");
const outDir = resolve(root, "exports/dedup-audit");

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

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

function extractQuotedRoot(questionText) {
  const q = String(questionText ?? "").trim();
  if (!q) return null;

  // Most common approved pattern: Que veut dire "POV" ?
  const direct = q.match(
    /^que\s+veut\s+dire\s+["“”«»]([^"“”«»]{1,80})["“”«»]\s*\??$/i,
  );
  if (direct) return direct[1];

  // Fallback: first explicitly quoted token anywhere in the question.
  // Intentionally excludes apostrophes to avoid false captures like: qu'est-ce qu'un...
  const firstQuoted = q.match(/["“”«»]([^"“”«»]{1,80})["“”«»]/);
  if (firstQuoted) return firstQuoted[1];

  return null;
}

function summarizeQuestion(text, max = 120) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 3)}...`;
}

function pickCanonicalMember(group) {
  const rec = group.recommended_keep_id ?? null;
  const members = Array.isArray(group.members) ? group.members : [];
  if (!members.length) return null;
  if (rec) {
    const found = members.find((m) => m.id === rec);
    if (found) return found;
  }
  return members[0];
}

function suggestConceptKeyForGroup(group) {
  const canonical = pickCanonicalMember(group);
  const canonicalQuestion = canonical?.question_preview ?? "";
  const groupKey = String(group.key ?? "");

  const quoted = extractQuotedRoot(canonicalQuestion);
  if (quoted) {
    const slug = toConceptSlug(quoted);
    if (slug) {
      return {
        concept_key_suggested: slug,
        suggestion_reason: "quoted_root_from_canonical_question",
        suggestion_confidence: "high",
      };
    }
  }

  // Fallback to normalized duplicate key if no quoted root is available.
  const slugFromKey = toConceptSlug(groupKey);
  if (slugFromKey) {
    return {
      concept_key_suggested: slugFromKey,
      suggestion_reason: "normalized_duplicate_group_key",
      suggestion_confidence: "medium",
    };
  }

  return {
    concept_key_suggested: "",
    suggestion_reason: "no_confident_signal",
    suggestion_confidence: "low",
  };
}

function main() {
  if (!existsSync(inPath)) {
    console.error("Missing input:", inPath);
    process.exit(1);
  }

  const doc = JSON.parse(readFileSync(inPath, "utf8"));
  const groups = Array.isArray(doc.exact_duplicate_groups)
    ? doc.exact_duplicate_groups
    : [];

  const rows = [];
  const groupSummaries = [];

  for (const g of groups) {
    const groupId = String(g.group_id ?? "");
    const members = Array.isArray(g.members) ? g.members : [];
    if (!groupId || members.length <= 1) continue;

    const suggestion = suggestConceptKeyForGroup(g);
    const canonicalId = g.recommended_keep_id ?? members[0]?.id ?? "";
    const canonicalPreview = summarizeQuestion(
      members.find((m) => m.id === canonicalId)?.question_preview ??
        members[0]?.question_preview ??
        "",
    );

    groupSummaries.push({
      duplicate_group_id: groupId,
      normalized_question_key: String(g.key ?? ""),
      group_size: members.length,
      canonical_question_id: canonicalId,
      canonical_question_preview: canonicalPreview,
      concept_key_suggested: suggestion.concept_key_suggested,
      suggestion_reason: suggestion.suggestion_reason,
      suggestion_confidence: suggestion.suggestion_confidence,
      review_status: "pending",
      reviewer_notes: "",
    });

    for (const m of members) {
      rows.push({
        duplicate_group_id: groupId,
        normalized_question_key: String(g.key ?? ""),
        group_size: members.length,
        question_id: String(m.id ?? ""),
        recommended_keep: m.id === canonicalId ? "yes" : "no",
        status: String(m.status ?? ""),
        is_active: String(m.is_active ?? ""),
        theme: String(m.theme ?? ""),
        difficulty: String(m.difficulty ?? ""),
        question_preview: summarizeQuestion(m.question_preview),
        concept_key_suggested: suggestion.concept_key_suggested,
        suggestion_reason: suggestion.suggestion_reason,
        suggestion_confidence: suggestion.suggestion_confidence,
        review_status: "pending",
        reviewer_notes: "",
      });
    }
  }

  rows.sort((a, b) => {
    const dg = a.duplicate_group_id.localeCompare(b.duplicate_group_id);
    if (dg !== 0) return dg;
    if (a.recommended_keep !== b.recommended_keep) {
      return a.recommended_keep === "yes" ? -1 : 1;
    }
    return a.question_id.localeCompare(b.question_id);
  });
  groupSummaries.sort((a, b) =>
    a.duplicate_group_id.localeCompare(b.duplicate_group_id),
  );

  const headers = [
    "duplicate_group_id",
    "normalized_question_key",
    "group_size",
    "question_id",
    "recommended_keep",
    "status",
    "is_active",
    "theme",
    "difficulty",
    "question_preview",
    "concept_key_suggested",
    "suggestion_reason",
    "suggestion_confidence",
    "review_status",
    "reviewer_notes",
  ];
  const groupHeaders = [
    "duplicate_group_id",
    "normalized_question_key",
    "group_size",
    "canonical_question_id",
    "canonical_question_preview",
    "concept_key_suggested",
    "suggestion_reason",
    "suggestion_confidence",
    "review_status",
    "reviewer_notes",
  ];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });

  const csvBody = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");
  const groupsCsvBody = [
    groupHeaders.join(","),
    ...groupSummaries.map((r) =>
      groupHeaders.map((h) => csvEscape(r[h])).join(","),
    ),
  ].join("\n");

  const csvStamped = join(outDir, `concept-key-suggestions-${stamp}.csv`);
  const csvLatest = join(outDir, "concept-key-suggestions-latest.csv");
  const groupsCsvStamped = join(
    outDir,
    `concept-key-group-suggestions-${stamp}.csv`,
  );
  const groupsCsvLatest = join(outDir, "concept-key-group-suggestions-latest.csv");

  writeFileSync(csvStamped, csvBody, "utf8");
  writeFileSync(csvLatest, csvBody, "utf8");
  writeFileSync(groupsCsvStamped, groupsCsvBody, "utf8");
  writeFileSync(groupsCsvLatest, groupsCsvBody, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "concept_key_stage1_preview_only",
    input: "exports/dedup-audit/dedup-audit-latest.json",
    duplicate_groups_reviewed: groupSummaries.length,
    question_rows_in_review_csv: rows.length,
    concept_suggestion_confidence: groupSummaries.reduce((acc, g) => {
      acc[g.suggestion_confidence] = (acc[g.suggestion_confidence] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: {
      rows_csv: [csvStamped, csvLatest],
      groups_csv: [groupsCsvStamped, groupsCsvLatest],
    },
    rules: {
      lowercase: true,
      ascii_slug: true,
      accents_removed: true,
      spaces_to_underscores: true,
      punctuation_removed: true,
      language_prefix: "none_stage1",
      quoted_root_extraction: "enabled",
    },
    no_db_updates: true,
  };

  const jsonPayload = {
    summary,
    group_suggestions: groupSummaries,
  };
  const jsonStamped = join(outDir, `concept-key-suggestions-${stamp}.json`);
  const jsonLatest = join(outDir, "concept-key-suggestions-latest.json");
  writeFileSync(jsonStamped, JSON.stringify(jsonPayload, null, 2), "utf8");
  writeFileSync(jsonLatest, JSON.stringify(jsonPayload, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main();
