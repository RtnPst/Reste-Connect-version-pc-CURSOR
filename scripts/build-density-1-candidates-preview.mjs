/**
 * Preview-only: density-1-daily-core-vernacular candidate batch.
 * No DB writes. Usage: node scripts/build-density-1-candidates-preview.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const labelsPath = resolve(root, "src/data/concept-labels-v1.json");
const dedupFlatPath = resolve(root, "exports/dedup-audit/dedup-audit-flat-latest.csv");
const outDir = resolve(root, "exports/foundation");

const PRIORITY_THEMES = new Set(["reseaux_sociaux", "relations_lifestyle"]);
const SECONDARY_THEMES = new Set(["vocabulaire", "trends_pop_culture"]);
const EXCLUDE_THEMES = new Set(["tech"]);

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function stripDiacritics(input) {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toConceptSlug(input) {
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/[''`]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "_");
  return s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function extractQuotedRoot(questionText) {
  const q = String(questionText ?? "").trim();
  if (!q) return null;
  const lead = q.match(/^[«"“„]([^»"”]{1,80})[»"”]/);
  if (lead) return lead[1].trim();
  const carre = q.match(/^["“”«»]?c.?est\s+carr[eé]/i);
  if (carre) return "C'est carré";
  const whenSays = q.match(
    /quand\s+quelqu['']un\s+(?:dit|écrit)\s+["“”«»]([^"“”«»]{1,80})["“”«»]/i,
  );
  if (whenSays) return whenSays[1].trim();
  const firstQuoted = q.match(/["“”«»]([^"“”«»]{1,80})["“”«»]/);
  if (firstQuoted) return firstQuoted[1].trim();
  return null;
}

const TERM_ALIASES = {
  cest_carre: "carre",
  red_flag: "red_flag",
  redflag: "red_flag",
  cest_valide: "valide",
  ghoster_quelquun: "ghoster",
  un_bail: "bail",
};

function resolveLabelSlug(surfaceTerm, currentKey) {
  if (currentKey && TERM_ALIASES[currentKey]) return TERM_ALIASES[currentKey];
  const slug = toConceptSlug(surfaceTerm);
  if (!slug) return null;
  if (TERM_ALIASES[slug]) return TERM_ALIASES[slug];
  return slug;
}

function loadDedupIndex() {
  const byId = new Map();
  if (!existsSync(dedupFlatPath)) return byId;
  const lines = readFileSync(dedupFlatPath, "utf8").split(/\r?\n/);
  const headers = lines[0]?.split(",") ?? [];
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const id = (cols[idx.id] ?? "").replace(/^"|"$/g, "");
    if (!id) continue;
    byId.set(id, {
      duplicate_group_id: cols[idx.exact_dup_group_id]?.replace(/^"|"$/g, "") ?? "",
      group_size: Number(cols[idx.exact_dup_group_size] ?? 1) || 1,
      is_canonical:
        (cols[idx.recommended_keep_in_exact_group]?.replace(/^"|"$/g, "") ?? "") ===
        "yes",
      daily_question_refs: Number(cols[idx.daily_question_refs] ?? 0) || 0,
      quiz_attempt_refs: Number(cols[idx.quiz_attempt_refs] ?? 0) || 0,
    });
  }
  return byId;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      cur += c;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function dupWarning(ded, questionId) {
  if (!ded || ded.group_size <= 1) return null;
  if (!ded.is_canonical) {
    return `duplicate_group_not_canonical:${ded.duplicate_group_id}`;
  }
  return `duplicate_group_ok:${ded.duplicate_group_id}_size_${ded.group_size}`;
}

function scoreRow(row, ded, dailyIds) {
  let score = 0;
  const isRetag = Boolean(row.concept_key?.trim());
  if (!isRetag) score += 40;
  else score += 25;
  if (PRIORITY_THEMES.has(row.theme)) score += 30;
  else if (SECONDARY_THEMES.has(row.theme)) score += 15;
  if (dailyIds.has(row.id) || (ded?.daily_question_refs ?? 0) > 0) score += 25;
  if ((ded?.quiz_attempt_refs ?? 0) > 0) score += 5;
  if (ded?.group_size > 1 && !ded.is_canonical) score -= 40;
  return score;
}

const env = loadEnv(envPath);
const url = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const labels = JSON.parse(readFileSync(labelsPath, "utf8"));
const labelKeys = new Set(Object.keys(labels));
const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });
const dedup = loadDedupIndex();

const { data: liveRows, error: liveErr } = await supabase
  .from("questions")
  .select("id, theme, question, explanation, concept_key, difficulty, is_active")
  .eq("status", "live");

if (liveErr) {
  console.error(liveErr.message);
  process.exit(1);
}

const { data: dailyRows } = await supabase.from("daily_questions").select("question_id");
const dailyIds = new Set((dailyRows ?? []).map((r) => r.question_id).filter(Boolean));

const liveTotal = liveRows?.length ?? 0;
const liveTagged = (liveRows ?? []).filter((r) => r.concept_key?.trim()).length;

const candidates = [];
for (const row of liveRows ?? []) {
  if (EXCLUDE_THEMES.has(row.theme)) continue;

  const surface = extractQuotedRoot(row.question);
  const suggested = resolveLabelSlug(surface ?? "", row.concept_key);
  if (!suggested || !labelKeys.has(suggested)) continue;

  const current = row.concept_key?.trim() || null;
  if (current === suggested) continue;

  const ded = dedup.get(row.id);
  const dailyEligible = dailyIds.has(row.id) || (ded?.daily_question_refs ?? 0) > 0;
  const dup = dupWarning(ded, row.id);
  const isRetag = Boolean(current);

  const needsReview =
    isRetag ||
    Boolean(dup?.includes("not_canonical")) ||
    (surface && toConceptSlug(surface) !== suggested && suggested === "valide");

  candidates.push({
    question_id: row.id,
    theme: row.theme,
    question_preview: String(row.question ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 110),
    current_concept_key: current,
    suggested_concept_key: suggested,
    display_label: labels[suggested],
    confidence: isRetag ? "high" : "high",
    reason: isRetag
      ? "retag_to_canonical_label_slug"
      : "quoted_term_maps_to_existing_label",
    surface_term: surface,
    needs_manual_editorial_review: needsReview,
    duplicate_canonical_warning: dup,
    daily_eligible: dailyEligible,
    action: isRetag ? "UPDATE_KEY" : "SET_KEY",
    uses_existing_label: true,
    requires_new_label: false,
    score: scoreRow(row, ded, dailyIds),
  });
}

candidates.sort((a, b) => b.score - a.score);
const batch = candidates.slice(0, 30);

const projectedTagged = new Set(
  (liveRows ?? []).filter((r) => r.concept_key?.trim()).map((r) => r.id),
);
for (const c of batch) {
  projectedTagged.add(c.question_id);
}

const labelDebt = (liveRows ?? [])
  .filter((r) => r.concept_key?.trim() && !labelKeys.has(r.concept_key.trim()))
  .map((r) => ({
    question_id: r.id,
    theme: r.theme,
    concept_key: r.concept_key,
    question_preview: String(r.question ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80),
    note: "Has concept_key but no entry in concept-labels-v1.json — memory UI will not surface until label added",
  }));

const sqlLines = [
  "-- PREVIEW ONLY — density-1-daily-core-vernacular",
  "-- Editorial sign-off required. Do not run in prod without review.",
  `-- Generated: ${new Date().toISOString()}`,
  `-- Rows: ${batch.length}`,
  "",
  "BEGIN;",
  ...batch.map((c) => {
    const cur = c.current_concept_key
      ? ` AND concept_key IS NOT DISTINCT FROM '${c.current_concept_key}'`
      : " AND concept_key IS NULL";
    return `UPDATE questions SET concept_key = '${c.suggested_concept_key}' WHERE id = '${c.question_id}' AND status = 'live'${cur};`;
  }),
  "COMMIT;",
  "",
  "-- Rollback preview:",
  ...batch.map((c) => {
    const rollbackVal = c.current_concept_key ? `'${c.current_concept_key}'` : "NULL";
    return `-- UPDATE questions SET concept_key = ${rollbackVal} WHERE id = '${c.question_id}';`;
  }),
];

const summary = {
  batch_name: "density-1-daily-core-vernacular",
  generated_at: new Date().toISOString(),
  policy: "preview_only_no_db_writes",
  current_live_total: liveTotal,
  current_live_tagged: liveTagged,
  current_coverage_percent: liveTotal ? Math.round((liveTagged / liveTotal) * 1000) / 10 : 0,
  batch_size: batch.length,
  batch_target: "25-30",
  target_met: batch.length >= 25 && batch.length <= 30,
  projected_live_tagged: projectedTagged.size,
  projected_coverage_percent: liveTotal
    ? Math.round((projectedTagged.size / liveTotal) * 1000) / 10
    : 0,
  existing_labels_used: batch.length,
  new_labels_required: 0,
  daily_eligible_in_batch: batch.filter((c) => c.daily_eligible).length,
  needs_manual_review_count: batch.filter((c) => c.needs_manual_editorial_review).length,
  duplicate_warnings_count: batch.filter((c) => c.duplicate_canonical_warning?.includes("not_canonical"))
    .length,
  priority_theme_count: batch.filter((c) => PRIORITY_THEMES.has(c.theme)).length,
  retag_count: batch.filter((c) => c.action === "UPDATE_KEY").length,
  new_tag_count: batch.filter((c) => c.action === "SET_KEY").length,
  label_debt_live_rows: labelDebt.length,
  risks: [],
  candidates: batch,
  label_debt_queue: labelDebt,
  honest_capacity_note:
    "Under guardrails (existing labels only, no tech), live pool yields ~10 high-confidence concept_key assignments. Reaching 25–30 requires Phase 1b: add editorial labels for already-keyed rows and/or new label slugs for social vernacular.",
};

if (!summary.target_met) {
  summary.risks.push(
    `Batch has ${batch.length} rows vs target 25–30 with existing-label-only guardrails.`,
  );
}
if (summary.label_debt_live_rows > 0) {
  summary.risks.push(
    `${summary.label_debt_live_rows} live rows already have concept_key but zero label JSON — fix label file in parallel for immediate emotional impact.`,
  );
}
if (summary.duplicate_warnings_count > 0) {
  summary.risks.push("Some rows are non-canonical in duplicate groups — confirm before apply.");
}
if (summary.needs_manual_review_count > 0) {
  summary.risks.push("Retag and alias rows flagged for manual editorial review.");
}

mkdirSync(outDir, { recursive: true });
const jsonPath = resolve(outDir, "density-1-daily-core-vernacular-preview-latest.json");
const sqlPath = resolve(outDir, "density-1-daily-core-vernacular-preview-latest.sql");
const csvPath = resolve(outDir, "density-1-daily-core-vernacular-preview-latest.csv");

writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeFileSync(sqlPath, `${sqlLines.join("\n")}\n`, "utf8");

const csvHeaders = [
  "question_id",
  "theme",
  "daily_eligible",
  "action",
  "current_concept_key",
  "suggested_concept_key",
  "display_label",
  "confidence",
  "reason",
  "needs_manual_editorial_review",
  "duplicate_canonical_warning",
  "question_preview",
];
const csvBody = [
  csvHeaders.join(","),
  ...batch.map((c) =>
    csvHeaders
      .map((h) => {
        const v = c[h];
        if (v == null) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  ),
].join("\n");
writeFileSync(csvPath, csvBody, "utf8");

console.log(
  JSON.stringify(
    {
      ...summary,
      candidates: undefined,
      label_debt_queue: undefined,
      outputs: { jsonPath, sqlPath, csvPath },
    },
    null,
    2,
  ),
);
