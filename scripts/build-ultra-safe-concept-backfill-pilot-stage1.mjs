/**
 * Build ultra-safe concept_key backfill pilot (preview-only).
 *
 * Target:
 * - 20-40 rows
 * - 10-20 groups
 *
 * Hard constraints:
 * - high confidence only
 * - single-group concept keys only
 * - no concept_key flagged in risk registry
 * - no semantic collision candidates
 * - no Batch 2 dormant groups
 * - no article-prefixed keys (un_ / une_ / le_ / la_)
 * - no cross-theme ambiguity
 * - no manual review flags
 *
 * Outputs:
 * - ultra-safe-concept-backfill-pilot-latest.csv
 * - ultra-safe-concept-backfill-pilot-latest.json
 * - ultra-safe-concept-backfill-pilot-proposed-sql-latest.sql (preview only)
 * - ultra-safe-concept-backfill-pilot-rollback-latest.sql (preview only)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");

const paths = {
  suggestions: resolve(outDir, "concept-key-suggestions-latest.csv"),
  firstSafe: resolve(outDir, "first-safe-backfill-candidate-latest.csv"),
  riskRegistry: resolve(outDir, "concept-key-risk-registry-latest.csv"),
  collisions: resolve(outDir, "concept-key-semantic-collision-review-latest.csv"),
  batch2: resolve(outDir, "soft-archive-batch-2-preview-latest.json"),
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(path) {
  if (!existsSync(path)) return { header: [], rows: [] };
  const raw = readFileSync(path, "utf8").trimEnd();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((s) => String(s).trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = c[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function main() {
  for (const p of Object.values(paths)) {
    if (!existsSync(p)) {
      console.error("Missing required artifact:", p);
      process.exit(1);
    }
  }

  const firstSafe = readCsv(paths.firstSafe);
  const suggestions = readCsv(paths.suggestions);
  const risk = readCsv(paths.riskRegistry);
  const collisions = readCsv(paths.collisions);
  const batch2 = JSON.parse(readFileSync(paths.batch2, "utf8"));

  // Build suggestion metadata maps by question and group.
  const suggestionByQuestion = new Map();
  const themesByGroup = new Map();
  for (const s of suggestions.rows) {
    const qid = String(s.question_id ?? "").trim();
    const gid = String(s.duplicate_group_id ?? "").trim();
    if (qid) suggestionByQuestion.set(qid, s);
    if (!themesByGroup.has(gid)) themesByGroup.set(gid, new Set());
    const th = String(s.theme ?? "").trim();
    if (th) themesByGroup.get(gid).add(th);
  }

  // Risky keys
  const riskyKeys = new Set();
  const riskyActionKeys = new Set();
  for (const r of risk.rows) {
    const k = String(r.concept_key ?? "").trim();
    if (!k) continue;
    riskyKeys.add(k);
    const action = String(r.suggested_action ?? "").trim();
    if (["manual_review", "expand_key", "split_later"].includes(action)) {
      riskyActionKeys.add(k);
    }
  }

  // collision keys
  const collisionKeys = new Set();
  for (const c of collisions.rows) {
    const a = String(c.key_a ?? "").trim();
    const b = String(c.key_b ?? "").trim();
    if (a) collisionKeys.add(a);
    if (b) collisionKeys.add(b);
  }

  // Batch2 groups
  const batch2Groups = new Set(
    (Array.isArray(batch2.groups) ? batch2.groups : [])
      .map((g) => String(g.group_id ?? "").trim())
      .filter(Boolean),
  );

  // Determine concept_key -> how many distinct groups in first-safe set
  const includedFirstSafe = firstSafe.rows.filter(
    (r) => String(r.inclusion_status ?? "") === "included_safe_batch",
  );
  const conceptGroups = new Map(); // concept -> Set<gid>
  for (const r of includedFirstSafe) {
    const ck = String(r.proposed_concept_key ?? "").trim();
    const gid = String(r.duplicate_group_id ?? "").trim();
    if (!ck || !gid) continue;
    if (!conceptGroups.has(ck)) conceptGroups.set(ck, new Set());
    conceptGroups.get(ck).add(gid);
  }

  function isArticlePrefixed(ck) {
    return /^(un|une|le|la)_/.test(String(ck ?? "").trim());
  }

  // Ultra-safe filtering.
  const withReasons = [];
  for (const r of includedFirstSafe) {
    const qid = String(r.question_id ?? "").trim();
    const gid = String(r.duplicate_group_id ?? "").trim();
    const ck = String(r.proposed_concept_key ?? "").trim();
    const confidence = String(r.confidence ?? "").trim();

    const reasons = [];
    if (confidence !== "high") reasons.push("confidence_not_high");
    if (riskyKeys.has(ck)) reasons.push("key_flagged_in_risk_registry");
    if (riskyActionKeys.has(ck)) reasons.push("key_requires_manual_review");
    if (collisionKeys.has(ck)) reasons.push("semantic_collision_candidate");
    if (batch2Groups.has(gid)) reasons.push("batch2_dormant_group");
    if (isArticlePrefixed(ck)) reasons.push("article_prefixed_key");

    const conceptGroupCount = conceptGroups.get(ck)?.size ?? 0;
    if (conceptGroupCount !== 1) reasons.push("not_single_group_concept_key");

    const themes = themesByGroup.get(gid) ?? new Set();
    if (themes.size > 1) reasons.push("cross_theme_ambiguity");

    const src = String(r.source ?? "");
    if (/manual/i.test(src)) reasons.push("manual_review_source_not_allowed_for_ultra_safe");

    withReasons.push({
      question_id: qid,
      duplicate_group_id: gid,
      current_concept_key: String(r.current_concept_key ?? ""),
      proposed_concept_key: ck,
      source: src || "concept_key_suggestion_default",
      confidence,
      inclusion_status: reasons.length === 0 ? "included_ultra_safe" : "excluded",
      exclusion_reason: reasons.join(";"),
    });
  }

  // Keep only included and trim to pilot target 20-40 rows and 10-20 groups.
  const included = withReasons.filter((r) => r.inclusion_status === "included_ultra_safe");
  // deterministic order by group then qid
  included.sort((a, b) => {
    const dg = a.duplicate_group_id.localeCompare(b.duplicate_group_id);
    if (dg !== 0) return dg;
    return a.question_id.localeCompare(b.question_id);
  });

  // pick up to 20 groups and up to 40 rows, but prefer >=20 rows.
  const picked = [];
  const pickedGroups = new Set();
  for (const r of included) {
    const nextGroupCount = pickedGroups.has(r.duplicate_group_id)
      ? pickedGroups.size
      : pickedGroups.size + 1;
    if (nextGroupCount > 20) continue;
    if (picked.length >= 40) break;
    picked.push(r);
    pickedGroups.add(r.duplicate_group_id);
  }

  // if too many groups for a tight pilot, cap to 20 already; if fewer than 10 groups, keep what exists.
  const pickedRows = picked;
  const pickedGroupCount = pickedGroups.size;

  const outputRows = withReasons.map((r) => {
    if (pickedRows.includes(r)) return r;
    if (r.inclusion_status === "included_ultra_safe") {
      return { ...r, inclusion_status: "excluded", exclusion_reason: "outside_pilot_size_cap" };
    }
    return r;
  });

  // Summaries
  const excludedReasonCounts = {};
  for (const r of outputRows) {
    if (r.inclusion_status !== "excluded") continue;
    for (const reason of String(r.exclusion_reason ?? "").split(";").filter(Boolean)) {
      excludedReasonCounts[reason] = (excludedReasonCounts[reason] ?? 0) + 1;
    }
  }

  const pilotIncluded = outputRows.filter((r) => r.inclusion_status === "included_ultra_safe");
  const pilotGroupSet = new Set(pilotIncluded.map((r) => r.duplicate_group_id));
  const conceptExamples = [...new Set(pilotIncluded.map((r) => r.proposed_concept_key))]
    .slice(0, 12);

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // CSV
  const headers = [
    "question_id",
    "duplicate_group_id",
    "current_concept_key",
    "proposed_concept_key",
    "source",
    "confidence",
    "inclusion_status",
    "exclusion_reason",
  ];
  const csvBody = [
    headers.join(","),
    ...outputRows.map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(",")),
  ].join("\n");
  const csvLatest = join(outDir, "ultra-safe-concept-backfill-pilot-latest.csv");
  const csvStamped = join(outDir, `ultra-safe-concept-backfill-pilot-${stamp}.csv`);
  writeFileSync(csvLatest, csvBody, "utf8");
  writeFileSync(csvStamped, csvBody, "utf8");

  // JSON
  const summary = {
    generated_at: new Date().toISOString(),
    policy: "ultra_safe_concept_key_backfill_pilot_preview_only",
    total_rows_evaluated: outputRows.length,
    rows_included: pilotIncluded.length,
    groups_included: pilotGroupSet.size,
    rows_excluded: outputRows.length - pilotIncluded.length,
    exclusion_reason_counts: excludedReasonCounts,
    concept_key_examples: conceptExamples,
    pilot_constraints: {
      target_rows_max: 40,
      target_groups_max: 20,
      high_confidence_only: true,
      single_group_concept_only: true,
      no_risk_registry_keys: true,
      no_semantic_collision_keys: true,
      no_batch2_dormant_groups: true,
      no_article_prefixed_keys: true,
      no_cross_theme_ambiguity: true,
      no_manual_review_flags: true,
    },
    outputs: {
      csv: [csvLatest, csvStamped],
    },
    no_db_updates: true,
  };
  const jsonLatest = join(outDir, "ultra-safe-concept-backfill-pilot-latest.json");
  const jsonStamped = join(outDir, `ultra-safe-concept-backfill-pilot-${stamp}.json`);
  writeFileSync(jsonLatest, JSON.stringify({ summary, rows: outputRows }, null, 2), "utf8");
  writeFileSync(jsonStamped, JSON.stringify({ summary, rows: outputRows }, null, 2), "utf8");

  // SQL preview only
  const sqlPreview = `-- PREVIEW ONLY: ultra-safe concept_key backfill pilot
-- Included rows: ${pilotIncluded.length}
-- Included groups: ${pilotGroupSet.size}
-- No execution from this artifact.

CREATE TEMP TABLE _ultra_safe_concept_key_pilot (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _ultra_safe_concept_key_pilot (question_id, new_concept_key) VALUES
${pilotIncluded.map((r) => `  ('${r.question_id}'::uuid, '${r.proposed_concept_key}')`).join(",\n")};

-- Preview update only:
-- UPDATE public.questions q
-- SET concept_key = p.new_concept_key
-- FROM _ultra_safe_concept_key_pilot p
-- WHERE q.id = p.question_id
--   AND q.concept_key IS DISTINCT FROM p.new_concept_key;
`;
  const sqlLatest = join(
    outDir,
    "ultra-safe-concept-backfill-pilot-proposed-sql-latest.sql",
  );
  const sqlStamped = join(
    outDir,
    `ultra-safe-concept-backfill-pilot-proposed-sql-${stamp}.sql`,
  );
  writeFileSync(sqlLatest, sqlPreview, "utf8");
  writeFileSync(sqlStamped, sqlPreview, "utf8");

  // Rollback preview only
  const rollback = `-- PREVIEW ONLY: rollback template for ultra-safe pilot
-- Capture real pre-update concept_key at execution time.

CREATE TEMP TABLE _ultra_safe_concept_key_pilot_rollback (
  question_id uuid PRIMARY KEY,
  old_concept_key text
) ON COMMIT DROP;

INSERT INTO _ultra_safe_concept_key_pilot_rollback (question_id, old_concept_key) VALUES
${pilotIncluded.map((r) => `  ('${r.question_id}'::uuid, NULL)`).join(",\n")};

-- Preview rollback only:
-- UPDATE public.questions q
-- SET concept_key = r.old_concept_key
-- FROM _ultra_safe_concept_key_pilot_rollback r
-- WHERE q.id = r.question_id;
`;
  const rollbackLatest = join(
    outDir,
    "ultra-safe-concept-backfill-pilot-rollback-latest.sql",
  );
  const rollbackStamped = join(
    outDir,
    `ultra-safe-concept-backfill-pilot-rollback-${stamp}.sql`,
  );
  writeFileSync(rollbackLatest, rollback, "utf8");
  writeFileSync(rollbackStamped, rollback, "utf8");

  console.log(
    JSON.stringify(
      {
        summary,
        outputs: {
          sql_preview: [sqlLatest, sqlStamped],
          rollback_preview: [rollbackLatest, rollbackStamped],
        },
      },
      null,
      2,
    ),
  );
}

main();

