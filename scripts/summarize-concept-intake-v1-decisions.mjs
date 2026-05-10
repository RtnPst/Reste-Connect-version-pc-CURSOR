/**
 * Concept Intake v1.1 decision summary (review-only).
 *
 * Input:
 *   exports/dedup-audit/concept-intake-v1-review-latest.csv
 *
 * Outputs:
 *   exports/dedup-audit/concept-intake-v1-decision-summary-latest.csv
 *   exports/dedup-audit/concept-intake-v1-decision-summary-latest.json
 *   timestamped copies with same prefix
 *
 * Usage:
 *   node scripts/summarize-concept-intake-v1-decisions.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputCsv = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");
const outDir = resolve(root, "exports/dedup-audit");

const VALID_DECISIONS = new Set(["approve", "reject", "merge", "watchlist"]);

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
  if (!existsSync(path)) {
    console.error("Missing input:", path);
    process.exit(1);
  }
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n");
  if (lines.length <= 1) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function normalizeDecision(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return VALID_DECISIONS.has(v) ? v : "";
}

function collectRiskStats(rows) {
  const counts = {};
  for (const row of rows) {
    const flags = String(row.risk_flags ?? "")
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean);
    for (const f of flags) {
      counts[f] = (counts[f] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([risk_flag, count]) => ({ risk_flag, count }));
}

function decisionStatus(row) {
  const raw = String(row.human_decision ?? "").trim();
  const normalized = normalizeDecision(raw);
  if (!raw) return { decision: "", status: "unresolved_empty" };
  if (!normalized) return { decision: raw, status: "unresolved_invalid" };
  return { decision: normalized, status: "resolved" };
}

function main() {
  const rows = loadCsvRows(inputCsv);
  const stamped = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });

  const summaryRows = rows.map((row) => {
    const { decision, status } = decisionStatus(row);
    return {
      raw_term: row.raw_term ?? "",
      suggested_concept_key: row.suggested_concept_key ?? "",
      suggested_theme: row.suggested_theme ?? "",
      confidence: row.confidence ?? "",
      risk_flags: row.risk_flags ?? "",
      human_decision: decision,
      human_notes: row.human_notes ?? "",
      decision_status: status,
    };
  });

  const approved = summaryRows.filter((r) => r.human_decision === "approve");
  const rejected = summaryRows.filter((r) => r.human_decision === "reject");
  const watchlist = summaryRows.filter((r) => r.human_decision === "watchlist");
  const merged = summaryRows.filter((r) => r.human_decision === "merge");
  const unresolved = summaryRows.filter((r) => r.decision_status !== "resolved");

  const riskSummary = collectRiskStats(summaryRows);

  const headers = [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "confidence",
    "risk_flags",
    "human_decision",
    "human_notes",
    "decision_status",
  ];
  const csvBody = [
    headers.join(","),
    ...summaryRows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");

  const csvStamped = join(outDir, `concept-intake-v1-decision-summary-${stamped}.csv`);
  const csvLatest = join(outDir, "concept-intake-v1-decision-summary-latest.csv");
  writeFileSync(csvStamped, csvBody, "utf8");
  writeFileSync(csvLatest, csvBody, "utf8");

  const jsonPayload = {
    generated_at: new Date().toISOString(),
    policy: "concept_intake_v1_review_only",
    input: "exports/dedup-audit/concept-intake-v1-review-latest.csv",
    counts: {
      total: summaryRows.length,
      approved: approved.length,
      rejected: rejected.length,
      watchlist: watchlist.length,
      merge: merged.length,
      unresolved: unresolved.length,
    },
    approved_concepts_summary: approved,
    rejected_concepts_summary: rejected,
    merge_watchlist_summary: [...merged, ...watchlist],
    unresolved_rows: unresolved,
    risk_summary: riskSummary,
    outputs: {
      decision_summary_csv: [csvStamped, csvLatest],
    },
    no_db_writes: true,
    no_imports: true,
    no_question_generation: true,
    no_automatic_publishing: true,
  };

  const jsonStamped = join(outDir, `concept-intake-v1-decision-summary-${stamped}.json`);
  const jsonLatest = join(outDir, "concept-intake-v1-decision-summary-latest.json");
  writeFileSync(jsonStamped, JSON.stringify(jsonPayload, null, 2), "utf8");
  writeFileSync(jsonLatest, JSON.stringify(jsonPayload, null, 2), "utf8");

  console.log(JSON.stringify(jsonPayload.counts, null, 2));
}

main();

