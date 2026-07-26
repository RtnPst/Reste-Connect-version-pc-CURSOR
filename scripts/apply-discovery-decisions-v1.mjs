/**
 * Apply editorial decisions on discovery batch + sync intake review CSV.
 * Then re-summarize decisions.
 *
 * Usage: node scripts/apply-discovery-decisions-v1.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  csvEscape,
  loadJson,
  parseCsvLine,
  root,
  toConceptSlug,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

/** Editorial decisions for discovery v1 (agent judgment, authenticity-first). */
const DECISIONS = {
  rizz: {
    decision: "approve",
    notes: "Usage FR vivant, scène story crédible — bon candidat 35–55.",
  },
  soft_launch: {
    decision: "approve",
    notes: "Scène Instagram très claire ; paire soft/hard utile.",
  },
  hard_launch: {
    decision: "approve",
    notes: "Complète soft launch ; lecture publique vs douce.",
  },
  touch_grass: {
    decision: "approve",
    notes: "Vanne pote→pote anti-écran ; éviter angle moralisateur.",
  },
  main_character: {
    decision: "approve",
    notes: "Lifestyle reconnaissable ; piège narcissisme vs fun.",
  },
  locked_in: {
    decision: "approve",
    notes: "Focus study/sport/boulot — scène crédible.",
  },
  iykyk: {
    decision: "approve",
    notes: "Connivence sociale ; angle reconnaissance pas glossaire.",
  },
  ate: {
    decision: "watchlist",
    notes: "Micro-tendance EN — ancrage FR à confirmer.",
  },
  glaze: {
    decision: "watchlist",
    notes: "Niche / récent — observer avant production.",
  },
  beige_flag: {
    decision: "watchlist",
    notes: "Complète red_flag mais micro_trend — watchlist.",
  },
  // already known — mark skip in discovery only
  no_cap: { decision: "reject", notes: "Déjà couvert / near cap — skip." },
  slay: { decision: "reject", notes: "Déjà dans labels — skip novelty." },
  mid: { decision: "reject", notes: "Déjà dans labels — skip novelty." },
  situationship: { decision: "reject", notes: "Déjà live — skip." },
  npc: { decision: "reject", notes: "Déjà dans labels — skip." },
};

function patchCsv(path, keyField = "suggested_concept_key") {
  if (!existsSync(path)) return { path, patched: 0 };
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  const lines = text.split("\n");
  const headers = parseCsvLine(lines[0]);
  const ki = headers.indexOf(keyField);
  const di = headers.indexOf("human_decision");
  const ni = headers.indexOf("human_notes");
  if (ki < 0 || di < 0) return { path, patched: 0 };
  let patched = 0;
  const out = [headers.join(",")];
  for (const line of lines.slice(1)) {
    const vals = parseCsvLine(line);
    const key = toConceptSlug(vals[ki]);
    const d = DECISIONS[key];
    if (d) {
      vals[di] = d.decision;
      if (ni >= 0) vals[ni] = d.notes;
      patched += 1;
    }
    out.push(vals.map(csvEscape).join(","));
  }
  writeFileSync(path, `${out.join("\n")}\n`, "utf8");
  return { path, patched };
}

const discoveryCsv = resolve(root, "exports/dedup-audit/concept-discovery-v1-latest.csv");
const intakeCsv = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");
const discoveryJsonPath = resolve(root, "exports/dedup-audit/concept-discovery-v1-latest.json");

const r1 = patchCsv(discoveryCsv);
const r2 = patchCsv(intakeCsv);

if (existsSync(discoveryJsonPath)) {
  const doc = loadJson(discoveryJsonPath);
  for (const row of doc.rows ?? []) {
    const key = toConceptSlug(row.suggested_concept_key);
    const d = DECISIONS[key];
    if (d) {
      row.human_decision = d.decision;
      row.human_notes = d.notes;
    }
  }
  writeJson(discoveryJsonPath, doc);
}

const summary = {
  generated_at: new Date().toISOString(),
  policy: "discovery_decisions_v1_agent_editorial",
  approved: Object.entries(DECISIONS)
    .filter(([, v]) => v.decision === "approve")
    .map(([k]) => k),
  watchlist: Object.entries(DECISIONS)
    .filter(([, v]) => v.decision === "watchlist")
    .map(([k]) => k),
  rejected_or_skip: Object.entries(DECISIONS)
    .filter(([, v]) => v.decision === "reject")
    .map(([k]) => k),
  csv_patched: [r1, r2],
};

writeJson(resolve(root, "exports/dedup-audit/concept-discovery-decisions-v1-latest.json"), summary);
console.log(JSON.stringify(summary, null, 2));
