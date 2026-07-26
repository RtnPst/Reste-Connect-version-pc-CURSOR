/**
 * FR-first discovery seed (France usage + Gen Z/Alpha hybrid).
 * Writes research artifact + merges novel candidates into raw_signals.
 *
 * Usage:
 *   node scripts/seed-fr-first-discovery-v1.mjs
 *   node scripts/seed-fr-first-discovery-v1.mjs --merge-signals
 */
import { resolve } from "node:path";
import {
  buildNoveltyIndex,
  collisionAgainstIndex,
  loadJson,
  root,
  scoreAuthenticity,
  stampIso,
  toConceptSlug,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const MERGE = process.argv.includes("--merge-signals");

/**
 * fr_fit: strong | medium | weak | meme_mode
 * placement: theme_pool | daily_friendly | watchlist
 */
const FR_CANDIDATES = [
  {
    raw_term: "kiffer",
    aliases: ["je kiffe", "kiff"],
    example_usage: "Je kiffe trop cette série.",
    short_definition: "Aimer beaucoup / apprécier fort.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR oral classique encore massif — cœur 35–55.",
  },
  {
    raw_term: "peinard",
    aliases: ["être peinard", "tranquille peinard"],
    example_usage: "Laisse, je suis peinard.",
    short_definition: "Tranquille / sans stress / bien installé.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Argot FR durable — scène pote / famille.",
  },
  {
    raw_term: "thune",
    aliases: ["la thune", "pas de thune"],
    example_usage: "J’ai plus de thune ce mois-ci.",
    short_definition: "Argent.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Argot FR universel — utile décennie + aujourd’hui.",
  },
  {
    raw_term: "waz",
    aliases: ["wesh waz", "wazaaa"],
    example_usage: "Waz, ça va ?",
    short_definition: "Salut / appel informel (proche de wesh).",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Oral cité FR ; voisin de wesh déjà live.",
  },
  {
    raw_term: "dz",
    aliases: ["la dz", "dz team"],
    example_usage: "Il est dz de ouf.",
    short_definition: "Algérien / lié à l’Algérie (code d’appartenance).",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Code FR / diaspora — scènes sociales réelles (prudence ton respectueux).",
  },
  {
    raw_term: "chelou",
    aliases: ["c’est chelou", "trop chelou"],
    example_usage: "Son message est chelou.",
    short_definition: "Bizarre / louche (verlan de louche).",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Verlan FR incontournable.",
  },
  {
    raw_term: "seum",
    aliases: ["avoir le seum", "gros seum"],
    example_usage: "J’ai le seum, j’ai raté le bus.",
    short_definition: "Avoir la rage / être vexé / déçu.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR ado/jeune adulte massif — excellent pour 35–55.",
  },
  {
    raw_term: "vénère",
    aliases: ["je suis vénère", "trop vénère"],
    example_usage: "Là je suis vénère.",
    short_definition: "Énervé / en colère (verlan d’énervé).",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Verlan FR classique.",
  },
  {
    raw_term: "boloss",
    aliases: ["gros boloss", "bolosse"],
    example_usage: "Arrête de faire le boloss.",
    short_definition: "Quelqu’un de naïf / ridicule / facile à avoir.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR années 2000–aujourd’hui — pont décennies.",
  },
  {
    raw_term: "ouf",
    aliases: ["de ouf", "c’est ouf"],
    example_usage: "La soirée était de ouf.",
    short_definition: "Fou / impressionnant (verlan de fou).",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Verlan FR quotidien — scènes claires.",
  },
];

const FR_WEAK_OR_CADRE = [
  { concept_key: "album_drop", fr_fit: "weak", note: "Cull candidat — jargon EN musique." },
  { concept_key: "inside_joke", fr_fit: "weak", note: "Cull candidat — pas un code culturel FR." },
  { concept_key: "meme_template", fr_fit: "weak", note: "Cull candidat — méta EN." },
  { concept_key: "main_character", fr_fit: "medium", note: "Anglicisme TikTok ; secondaire vs FR hybride." },
];

const index = await buildNoveltyIndex({ fetchLive: false });
const outDir = resolve(root, "exports/dedup-audit");
const signalsPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");
const existingSignals = loadJson(signalsPath, { raw_signals: [] });
const existingKeys = new Set(
  (existingSignals.raw_signals ?? []).map((s) => toConceptSlug(s.raw_term)),
);

const rows = [];
for (const c of FR_CANDIDATES) {
  const key = toConceptSlug(c.raw_term);
  const collision = collisionAgainstIndex(key, index.keys);
  const auth = scoreAuthenticity(c);
  let recommendation = "approve_fr_first";
  if (collision.exact) recommendation = "skip_already_known";
  else if (c.placement === "daily_friendly") recommendation = "approve_daily_friendly";
  else if (c.fr_fit === "medium") recommendation = "approve_or_watchlist";

  rows.push({
    raw_term: c.raw_term,
    suggested_concept_key: key,
    suggested_theme: c.suggested_theme,
    short_definition: c.short_definition,
    aliases: (c.aliases ?? []).join("; "),
    example_usage: c.example_usage,
    trend_freshness: c.trend_freshness,
    trend_durability: c.trend_durability,
    fr_fit: c.fr_fit,
    placement: c.placement,
    novelty_status: collision.exact ? "already_known" : "novel_candidate",
    near_key: collision.near ? `${collision.near.key} (${collision.near.score})` : "",
    authenticity_gate: auth.authenticity_gate,
    suggested_usage_vitality: auth.suggested_usage_vitality,
    already_in_raw_signals: existingKeys.has(key) ? "yes" : "no",
    recommendation,
    discovery_note: c.discovery_note,
    human_decision: collision.exact ? "reject" : "approve",
    human_notes: c.discovery_note,
  });
}

const stamp = stampIso();
const doc = {
  generated_at: new Date().toISOString(),
  policy: "fr_first_app_orientation_v1",
  sources_note: "Batch 3 — argot FR durable (verlan, cité, oral).",
  principles: [
    "Prioriser FR hybride pour Tu Captes.",
    "Anglicismes OK seulement s’ils circulent oralement en France.",
  ],
  weak_en_cadre: FR_WEAK_OR_CADRE,
  counts: {
    proposed: rows.length,
    novel: rows.filter((r) => r.novelty_status === "novel_candidate").length,
    approved_in_seed: rows.filter((r) => r.human_decision === "approve").length,
  },
  rows,
};

writeJson(resolve(outDir, "fr-first-discovery-v1-latest.json"), doc);
writeJson(resolve(outDir, `fr-first-discovery-v1-${stamp}.json`), doc);
writeCsv(
  resolve(outDir, "fr-first-discovery-v1-latest.csv"),
  [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "short_definition",
    "fr_fit",
    "placement",
    "novelty_status",
    "recommendation",
    "human_decision",
    "discovery_note",
  ],
  rows,
);

if (MERGE) {
  const toAdd = rows.filter(
    (r) => r.human_decision === "approve" && r.novelty_status === "novel_candidate",
  );
  const nextSignals = [...(existingSignals.raw_signals ?? [])];
  for (const r of toAdd) {
    const key = toConceptSlug(r.suggested_concept_key);
    if (existingKeys.has(key)) continue;
    nextSignals.push({
      raw_term: r.raw_term,
      aliases: r.aliases.split("; ").filter(Boolean),
      example_usage: r.example_usage,
      short_definition: r.short_definition,
      suggested_theme: r.suggested_theme,
      source: "fr_first_discovery_v1_batch3",
      fr_fit: r.fr_fit,
      placement: r.placement,
    });
    existingKeys.add(key);
  }
  writeJson(signalsPath, {
    ...existingSignals,
    updated_at: new Date().toISOString(),
    raw_signals: nextSignals,
  });
  doc.counts.merged = toAdd.length;
}

console.log(JSON.stringify({ ok: true, counts: doc.counts, merge: MERGE }, null, 2));
