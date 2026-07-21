/**
 * Shared helpers for concept intake / novelty / authenticity / promote.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function stripDiacritics(input) {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function toConceptSlug(input) {
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/['’`]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "_");
  s = s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return s;
}

export function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function parseCsvLine(line) {
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

export function loadCsvRows(path) {
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

export function writeCsv(path, headers, rows) {
  mkdirSync(dirname(path), { recursive: true });
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ];
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

export function writeJson(path, doc) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

export function loadJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadEnv() {
  const env = {};
  const path = resolve(root, ".env");
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

export function stampIso() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizedBigrams(s) {
  const v = ` ${toConceptSlug(s).replace(/_/g, " ")} `;
  const set = new Set();
  for (let i = 0; i < v.length - 1; i += 1) set.add(v.slice(i, i + 2));
  return set;
}

export function diceSimilarity(a, b) {
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

export function titleCaseLabel(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build novelty index from labels + pack + optional live DB + legacy CSVs.
 */
export async function buildNoveltyIndex({ fetchLive = true } = {}) {
  const sources = {};
  const byKey = new Map();

  function add(key, source, meta = {}) {
    const k = toConceptSlug(key);
    if (!k) return;
    if (!byKey.has(k)) byKey.set(k, { concept_key: k, sources: new Set(), meta: {} });
    const entry = byKey.get(k);
    entry.sources.add(source);
    Object.assign(entry.meta, meta);
  }

  const labelsPath = resolve(root, "src/data/concept-labels-v1.json");
  const labels = loadJson(labelsPath, {});
  sources.labels = Object.keys(labels).length;
  for (const [key, label] of Object.entries(labels)) {
    add(key, "labels", { label: String(label) });
  }

  const packPath = resolve(root, "src/data/cultural-pack-v1.json");
  const pack = loadJson(packPath, { concepts: [] });
  const packConcepts = Array.isArray(pack.concepts) ? pack.concepts : [];
  sources.pack = packConcepts.length;
  for (const c of packConcepts) {
    add(c.concept_key, "pack", {
      label: c.canonical_label,
      usage_vitality: c.usage_vitality,
      editorial_status: c.editorial_status,
      glossary_only: c.glossary_only === true,
    });
    for (const legacy of c.legacy_concept_keys ?? []) add(legacy, "pack_legacy");
    for (const form of c.surface_forms ?? []) {
      const slug = toConceptSlug(form);
      if (slug && slug !== toConceptSlug(c.concept_key)) add(slug, "pack_surface");
    }
  }

  const collisionCsvInputs = [
    {
      path: resolve(root, "exports/dedup-audit/concept-key-backfill-preview-latest.csv"),
      field: "new_concept_key",
      source: "backfill_csv",
    },
    {
      path: resolve(root, "exports/dedup-audit/concept-key-group-review-latest.csv"),
      field: "final_recommended_concept_key",
      source: "group_review_csv",
    },
    {
      path: resolve(root, "exports/dedup-audit/concept-key-suggestions-latest.csv"),
      field: "concept_key_suggested",
      source: "suggestions_csv",
    },
  ];
  sources.csv_files = 0;
  for (const src of collisionCsvInputs) {
    const rows = loadCsvRows(src.path);
    if (rows.length) sources.csv_files += 1;
    for (const row of rows) add(row[src.field], src.source);
  }

  sources.live = 0;
  sources.live_fetch = "skipped";
  if (fetchLive) {
    const env = loadEnv();
    const url = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "")
      .trim()
      .replace(/\/+$/, "");
    const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
    if (url && key) {
      try {
        const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });
        const { data, error } = await supabase
          .from("questions")
          .select("concept_key")
          .eq("status", "live")
          .not("concept_key", "is", null);
        if (error) {
          sources.live_fetch = `error:${error.message}`;
        } else {
          sources.live_fetch = "ok";
          const liveKeys = new Set();
          for (const row of data ?? []) {
            if (row.concept_key) {
              liveKeys.add(row.concept_key);
              add(row.concept_key, "live_db");
            }
          }
          sources.live = liveKeys.size;
        }
      } catch (e) {
        sources.live_fetch = `error:${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      sources.live_fetch = "missing_env";
    }
  }

  const keys = [...byKey.keys()].sort();
  return {
    generated_at: new Date().toISOString(),
    sources,
    key_count: keys.length,
    keys,
    entries: keys.map((k) => {
      const e = byKey.get(k);
      return {
        concept_key: k,
        sources: [...e.sources].sort(),
        ...e.meta,
      };
    }),
  };
}

export function collisionAgainstIndex(suggestedKey, indexKeys) {
  const exact = indexKeys.includes(suggestedKey);
  let bestNear = "";
  let bestNearScore = 0;
  for (const key of indexKeys) {
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

/**
 * Authenticity heuristic (no scrape). Returns gate + flags + suggested vitality.
 */
export function scoreAuthenticity(entry, packEntry = null) {
  const flags = [];
  const example = String(entry.example_usage ?? "").trim();
  const definition = String(entry.short_definition ?? "").trim();
  const raw = String(entry.raw_term ?? entry.concept_key ?? "").trim();

  if (!example) flags.push("missing_example_usage");
  if (!definition || /définition à valider/i.test(definition)) flags.push("definition_needs_review");
  if (example && /ce post est|exemple à valider/i.test(example)) flags.push("example_feels_template");

  const durability = String(entry.trend_durability ?? "").toLowerCase();
  if (durability === "micro_trend") flags.push("micro_trend_volatility");

  if (packEntry) {
    if (packEntry.glossary_only === true) flags.push("pack_glossary_only");
    if (packEntry.usage_vitality === "listed_only" || packEntry.usage_vitality === "theoretical") {
      flags.push(`pack_vitality_${packEntry.usage_vitality}`);
    }
  }

  // Weak glossary-smell: definition-only tone without scene cues
  if (definition && !example && /signifie|veut dire|désigne/i.test(definition)) {
    flags.push("glossary_definition_tone");
  }

  // Scene cues in example → living signal
  const sceneCue =
    /(whatsapp|story|tweet|tiktok|groupe|pote|vocal|commentaire|feed|dm|snap)/i.test(example);

  let suggested_vitality = "theoretical";
  if (packEntry?.usage_vitality) {
    suggested_vitality = packEntry.usage_vitality;
  } else if (example && sceneCue && !flags.includes("example_feels_template")) {
    suggested_vitality = "living";
  } else if (example && !flags.includes("example_feels_template")) {
    suggested_vitality = "observed_irl";
  } else if (definition && !example) {
    suggested_vitality = "listed_only";
  }

  const blocking = [
    "pack_glossary_only",
    "pack_vitality_listed_only",
    "pack_vitality_theoretical",
    "missing_example_usage",
  ];
  const hasBlock = flags.some((f) => blocking.includes(f));
  const softOk = ["living", "observed_irl", "passive"].includes(suggested_vitality);

  let gate = "needs_human";
  if (hasBlock || suggested_vitality === "listed_only" || suggested_vitality === "theoretical") {
    gate = "block_drafts";
  } else if (softOk && flags.filter((f) => f !== "definition_needs_review").length <= 1) {
    gate = "pass_with_review";
  }

  return {
    raw_term: raw,
    authenticity_gate: gate,
    suggested_usage_vitality: suggested_vitality,
    authenticity_flags: flags.join("; "),
    scene_cue: sceneCue ? "yes" : "no",
  };
}
