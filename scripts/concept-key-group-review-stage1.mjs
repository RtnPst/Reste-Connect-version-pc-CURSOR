/**
 * Stage 1 group-level view for concept_key review (review-only).
 *
 * Input:
 *   - exports/dedup-audit/concept-key-suggestions-latest.csv
 *   - exports/dedup-audit/concept-key-suggestions-override-flags-latest.csv (optional)
 *
 * Output:
 *   - exports/dedup-audit/concept-key-group-review-latest.csv
 *
 * No DB updates, no backfill, no gameplay logic changes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inSuggestions = resolve(
  root,
  "exports/dedup-audit/concept-key-suggestions-latest.csv",
);
const inOverrides = resolve(
  root,
  "exports/dedup-audit/concept-key-suggestions-override-flags-latest.csv",
);
const outDir = resolve(root, "exports/dedup-audit");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Escaped quote: "" inside a quoted field.
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

function readCsv(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8").trimEnd();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((s) => String(s).trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cells[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

function pickCanonicalRow(rows) {
  // From suggestions CSV we expect recommended_keep=yes marker.
  const rec = rows.find((r) => String(r.recommended_keep ?? "").trim() === "yes");
  return rec ?? rows[0] ?? null;
}

function splitUnique(sep, s) {
  const arr = String(s ?? "")
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
  return [...new Set(arr)];
}

function main() {
  if (!existsSync(inSuggestions)) {
    console.error("Missing suggestions CSV:", inSuggestions);
    process.exit(1);
  }

  const sug = readCsv(inSuggestions);
  if (!sug || !Array.isArray(sug.rows)) {
    console.error("Unable to parse suggestions CSV.");
    process.exit(1);
  }

  const ov = readCsv(inOverrides);
  const overrideByGroup = new Map();
  if (ov?.rows) {
    for (const r of ov.rows) {
      const gid = String(r.duplicate_group_id ?? "").trim();
      if (!gid) continue;
      if (!overrideByGroup.has(gid)) {
        overrideByGroup.set(gid, {
          suggestedOverride: "",
          issueTypes: new Set(),
        });
      }
      const cur = overrideByGroup.get(gid);
      const o = String(r.suggested_override_concept_key ?? "").trim();
      if (o) cur.suggestedOverride = o;
      const it = String(r.issue_types ?? "");
      for (const x of splitUnique(";", it)) cur.issueTypes.add(x);
    }
  }

  // Group aggregation.
  const groups = new Map();
  for (const row of sug.rows) {
    const gid = String(row.duplicate_group_id ?? "").trim();
    if (!gid) continue;

    if (!groups.has(gid)) groups.set(gid, []);
    groups.get(gid).push(row);
  }

  const headerOut = [
    "duplicate_group_id",
    "group_size",
    "suggested_concept_key",
    "suggested_override_concept_key",
    "final_recommended_concept_key",
    "issue_types",
    "confidence",
    "representative_question",
    "member_ids",
    "member_question_previews",
    "human_approved_concept_key",
    "human_notes",
  ];

  const lines = [headerOut.join(",")];

  const summary = {
    groups_reviewed: 0,
    groups_with_overrides: 0,
    groups_needing_manual_attention: 0,
    // "manual attention" means: issue_types non-empty (flagged)
  };

  const sortedGroupIds = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b),
  );

  for (const gid of sortedGroupIds) {
    const memberRows = groups.get(gid) ?? [];
    if (!memberRows.length) continue;

    summary.groups_reviewed += 1;

    const canonical = pickCanonicalRow(memberRows);
    const groupSize = String(canonical?.group_size ?? memberRows.length);
    const suggestedConceptKey = String(
      canonical?.concept_key_suggested ?? memberRows[0]?.concept_key_suggested ?? "",
    ).trim();
    const confidence = String(
      canonical?.suggestion_confidence ?? "",
    ).trim();
    const representativeQuestion = String(
      canonical?.question_preview ?? "",
    ).trim();

    const ids = memberRows
      .slice()
      .sort((a, b) => {
        const ar = String(a.recommended_keep ?? "").trim() === "yes" ? 0 : 1;
        const br = String(b.recommended_keep ?? "").trim() === "yes" ? 0 : 1;
        if (ar !== br) return ar - br;
        return String(a.question_id).localeCompare(String(b.question_id));
      })
      .map((r) => String(r.question_id ?? "").trim())
      .filter(Boolean);

    const previews = memberRows
      .slice()
      .sort((a, b) => {
        const ar = String(a.recommended_keep ?? "").trim() === "yes" ? 0 : 1;
        const br = String(b.recommended_keep ?? "").trim() === "yes" ? 0 : 1;
        if (ar !== br) return ar - br;
        return String(a.question_id).localeCompare(String(b.question_id));
      })
      .map((r) => String(r.question_preview ?? "").trim())
      .filter(Boolean);

    const ovg = overrideByGroup.get(gid);
    const suggestedOverride = ovg?.suggestedOverride ? String(ovg.suggestedOverride).trim() : "";
    const issueTypes = ovg?.issueTypes ? [...ovg.issueTypes].sort((a, b) => a.localeCompare(b)).join(";") : "";

    const finalRecommended = suggestedOverride ? suggestedOverride : suggestedConceptKey;

    if (suggestedOverride) summary.groups_with_overrides += 1;
    if (issueTypes) summary.groups_needing_manual_attention += 1;

    lines.push(
      [
        csvEscape(gid),
        csvEscape(groupSize),
        csvEscape(suggestedConceptKey),
        csvEscape(suggestedOverride),
        csvEscape(finalRecommended),
        csvEscape(issueTypes),
        csvEscape(confidence),
        csvEscape(representativeQuestion),
        csvEscape(ids.join(";")),
        csvEscape(previews.join(" | ")),
        csvEscape(""),
        csvEscape(""),
      ].join(","),
    );
  }

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "concept-key-group-review-latest.csv");
  writeFileSync(outPath, lines.join("\n"), "utf8");

  const canUseForFirstBackfill =
    summary.groups_needing_manual_attention < summary.groups_reviewed * 0.5;

  console.log(JSON.stringify({
    outPath,
    summary: {
      ...summary,
      groups_with_overrides: summary.groups_with_overrides,
      groups_needing_manual_attention: summary.groups_needing_manual_attention,
      suitability_for_first_backfill: canUseForFirstBackfill
        ? "suitable_with_review"
        : "needs_more_triage",
    },
    notes: [
      "This is review-only output. It does not write to DB.",
      "If you plan to use it as a backfill source, only backfill after human approval",
      " and after confirming overridden keys are desired at the concept level.",
    ],
  }, null, 2));
}

main();

