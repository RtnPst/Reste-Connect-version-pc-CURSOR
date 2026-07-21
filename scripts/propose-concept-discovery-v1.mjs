/**
 * Agent-assisted discovery: propose NEW vernacular candidates (no scrape).
 * Writes a review CSV + optionally merges novel ones into raw_signals (draft only).
 *
 * Usage:
 *   node scripts/propose-concept-discovery-v1.mjs
 *   node scripts/propose-concept-discovery-v1.mjs --merge-signals
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

/** Curated editorial proposals — scenes + usage, not glossary scraping. */
const SEED_CANDIDATES = [
  {
    raw_term: "rizz",
    aliases: ["avoir du rizz"],
    example_usage: "Il a trop de rizz en story, tout le monde répond.",
    short_definition: "Charisme / talent pour draguer ou captiver, souvent en ligne ou IRL léger.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Usage oral FR courant chez 15–30 ; scène story/groupe crédible.",
  },
  {
    raw_term: "no cap",
    aliases: ["cap", "capping"],
    example_usage: "No cap, ce plan était vraiment nul.",
    short_definition: "« Sans mentir » / « pour de vrai » — cap = mensonge.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Anglicisme très ancré ; attention piège « cap » seul.",
  },
  {
    raw_term: "iykyk",
    aliases: ["if you know you know"],
    example_usage: "La ref du week-end… iykyk.",
    short_definition: "Connivence : « ceux qui savent savent » — exclut gentiment.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Bon angle reconnaissance sociale, pas définition scolaire.",
  },
  {
    raw_term: "ate",
    aliases: ["ate that", "she ate"],
    example_usage: "La tenue ? She ate.",
    short_definition: "Réussite stylée / performance réussie (« elle a tout cartonnné »).",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "micro_trend",
    discovery_note: "Micro-tendance EN ; vérifier si assez ancré FR avant approve.",
  },
  {
    raw_term: "slay",
    aliases: ["slay queen"],
    example_usage: "T’as slay sur cette vidéo.",
    short_definition: "Cartonner, être au top — compliment performatif.",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Très spread ; risque satiété — angles scènes > glossaire.",
  },
  {
    raw_term: "mid",
    aliases: ["c’est mid"],
    example_usage: "Le film est mid, on s’ennuie un peu.",
    short_definition: "Moyen, sans éclat — ni nul ni ouf.",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Usage vivant FR ; bon distracteur vs « nul / ouf ».",
  },
  {
    raw_term: "touch grass",
    aliases: ["touch some grass"],
    example_usage: "T’es trop en ligne, go touch grass.",
    short_definition: "Sors un peu / reconnecte au réel — vanne anti-addiction écrans.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Scène pote → pote ; éviter parent moralisateur.",
  },
  {
    raw_term: "main character",
    aliases: ["main character energy"],
    example_usage: "Elle arrive en main character energy au resto.",
    short_definition: "Se mettre au centre du récit, attitude « héros du film ».",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Bon angle lifestyle ; piège : narcissisme vs fun.",
  },
  {
    raw_term: "beige flag",
    aliases: ["beige flags"],
    example_usage: "Il range ses chaussettes par couleur… beige flag ?",
    short_definition: "Trait ni red ni green : bizarre / mignon / neutre, un peu odd.",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "micro_trend",
    discovery_note: "Complète red_flag déjà live ; vérifier saturation.",
  },
  {
    raw_term: "situationship",
    aliases: ["situationships"],
    example_usage: "On est pas ensemble, c’est une situationship.",
    short_definition: "Relation floue, pas officialisée, entre crush et couple.",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Très demandé 35–55 qui entendent le mot ; déjà proche du thème relations.",
  },
  {
    raw_term: "soft launch",
    aliases: ["soft launch relation"],
    example_usage: "Elle a soft launch son mec en story (juste les mains).",
    short_definition: "Révéler quelqu’un / un projet en douceur, sans annonce claire.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Scène Instagram/story très claire.",
  },
  {
    raw_term: "hard launch",
    aliases: ["hard launch couple"],
    example_usage: "Hard launch : photo de couple en face cam.",
    short_definition: "Annonce publique claire d’une relation / projet.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Paire naturelle avec soft launch.",
  },
  {
    raw_term: "npc",
    aliases: ["comportement npc"],
    example_usage: "Il répond comme un npc en soirée.",
    short_definition: "Personne sans personnalité / réactions automatiques (jeu vidéo → social).",
    suggested_theme: "gaming",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Pont gaming → social ; éviter mépris gratuit.",
  },
  {
    raw_term: "glaze",
    aliases: ["glazing"],
    example_usage: "Arrête de glaze le mec, c’est gênant.",
    short_definition: "Complimenter / fanboyiser de façon excessive.",
    suggested_theme: "reseaux_sociaux",
    trend_freshness: "recent",
    trend_durability: "micro_trend",
    discovery_note: "Plus récent / niche — watchlist probable.",
  },
  {
    raw_term: "locked in",
    aliases: ["lock in"],
    example_usage: "Là je suis locked in sur mon dossier jusqu’à vendredi.",
    short_definition: "Hyper concentré / en mode focus total.",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    discovery_note: "Usage studytok / sport / boulot ; scène crédible.",
  },
];

const index = await buildNoveltyIndex({ fetchLive: true });
const outDir = resolve(root, "exports/dedup-audit");
const signalsPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");
const existingSignals = loadJson(signalsPath, { raw_signals: [] });
const existingSignalKeys = new Set(
  (existingSignals.raw_signals ?? []).map((s) => toConceptSlug(s.raw_term)),
);

const rows = [];
for (const c of SEED_CANDIDATES) {
  const key = toConceptSlug(c.raw_term);
  const collision = collisionAgainstIndex(key, index.keys);
  const auth = scoreAuthenticity(c);
  const inSignals = existingSignalKeys.has(key);
  let recommendation = "intake_candidate";
  if (collision.exact) recommendation = "skip_already_known";
  else if (auth.authenticity_gate === "block_drafts") recommendation = "enrich_scene_first";
  else if (String(c.trend_durability) === "micro_trend") recommendation = "watchlist_likely";

  rows.push({
    raw_term: c.raw_term,
    suggested_concept_key: key,
    suggested_theme: c.suggested_theme,
    short_definition: c.short_definition,
    aliases: (c.aliases ?? []).join("; "),
    example_usage: c.example_usage,
    trend_freshness: c.trend_freshness,
    trend_durability: c.trend_durability,
    novelty_status: collision.exact ? "already_known" : "novel_candidate",
    near_key: collision.near ? `${collision.near.key} (${collision.near.score})` : "",
    authenticity_gate: auth.authenticity_gate,
    suggested_usage_vitality: auth.suggested_usage_vitality,
    authenticity_flags: auth.authenticity_flags,
    already_in_raw_signals: inSignals ? "yes" : "no",
    recommendation,
    discovery_note: c.discovery_note,
    human_decision: "",
    human_notes: "",
  });
}

const novelForMerge = rows.filter(
  (r) => r.novelty_status === "novel_candidate" && r.already_in_raw_signals === "no",
);

if (MERGE && novelForMerge.length) {
  const next = { ...existingSignals };
  next.notes =
    (next.notes || "") +
    " | Discovery batch merged " +
    new Date().toISOString().slice(0, 10);
  next.raw_signals = [
    ...(next.raw_signals ?? []),
    ...novelForMerge.map((r) => ({
      raw_term: r.raw_term,
      aliases: r.aliases.split("; ").filter(Boolean),
      example_usage: r.example_usage,
      short_definition: r.short_definition,
      suggested_theme: r.suggested_theme,
      trend_freshness: r.trend_freshness,
      trend_durability: r.trend_durability,
      discovery_source: "propose_concept_discovery_v1",
    })),
  ];
  writeJson(signalsPath, next);
}

const stamp = stampIso();
const doc = {
  generated_at: new Date().toISOString(),
  policy: "discovery_v1_no_scrape_manual_seed",
  novelty_key_count: index.key_count,
  live_fetch: index.sources.live_fetch,
  counts: {
    proposed: rows.length,
    novel: rows.filter((r) => r.novelty_status === "novel_candidate").length,
    already_known: rows.filter((r) => r.novelty_status === "already_known").length,
    merged_into_signals: MERGE ? novelForMerge.length : 0,
  },
  rows,
};

writeJson(resolve(outDir, "concept-discovery-v1-latest.json"), doc);
writeJson(resolve(outDir, `concept-discovery-v1-${stamp}.json`), doc);
writeCsv(
  resolve(outDir, "concept-discovery-v1-latest.csv"),
  [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "short_definition",
    "aliases",
    "example_usage",
    "trend_freshness",
    "trend_durability",
    "novelty_status",
    "near_key",
    "authenticity_gate",
    "suggested_usage_vitality",
    "authenticity_flags",
    "already_in_raw_signals",
    "recommendation",
    "discovery_note",
    "human_decision",
    "human_notes",
  ],
  rows,
);

console.log(JSON.stringify({ ok: true, counts: doc.counts, merge: MERGE }, null, 2));
