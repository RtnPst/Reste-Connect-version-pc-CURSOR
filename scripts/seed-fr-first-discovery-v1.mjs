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
    raw_term: "chokbar",
    aliases: ["chockbar", "je suis chokbar"],
    example_usage: "J’ai vu la note… chokbar.",
    short_definition: "Être très choqué / surpris (souvent théâtral).",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR ado récurrent (presse parents 2025–26). Scène note/message.",
  },
  {
    raw_term: "goumin",
    aliases: ["en goumin", "être en goumin"],
    example_usage: "Depuis la rupture je suis en goumin.",
    short_definition: "Peine de cœur / douleur amoureuse.",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Ancré FR ; excellent pour 35–55 qui entendent le mot sans le dire.",
  },
  {
    raw_term: "mon pain",
    aliases: ["pain", "boulangerie"],
    example_usage: "Regarde mon pain sur Insta.",
    short_definition: "Crush physique / quelqu’un qui plaît beaucoup (souvent look).",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Code ado FR ; piège boulangerie littérale = or pour quiz.",
  },
  {
    raw_term: "aura",
    aliases: ["aura +1000", "aura -1000", "-1000 aura"],
    example_usage: "Avec ces lunettes, aura +1000.",
    short_definition: "Présence / vibe / charisme (souvent chiffré en meme).",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Très cité FR 2025 ; distinct d’aura farming (calculé).",
  },
  {
    raw_term: "pnj",
    aliases: ["PNJ", "comportement PNJ", "npc"],
    example_usage: "En soirée il répond comme un PNJ.",
    short_definition: "Figurant social : réactions automatiques, peu de personnalité.",
    suggested_theme: "gaming",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Version FR de NPC — prioriser le label PNJ pour l’app FR.",
  },
  {
    raw_term: "six seven",
    aliases: ["6-7", "67", "six-seveeen"],
    example_usage: "Il répond juste « six-seveeen » avec le geste des mains.",
    short_definition:
      "Catchphrase absurde Gen Alpha / TikTok : code d’appartenance, souvent sans sens fixe (proche du quoicoubeh).",
    suggested_theme: "trends_pop_culture",
    trend_freshness: "hot",
    trend_durability: "micro_trend",
    fr_fit: "meme_mode",
    placement: "daily_friendly",
    discovery_note:
      "Confirmé FR (TF1, Midi Libre, cours de récré). Idéal fil du jour / tendances — pas 10 Q en pool permanent.",
  },
  {
    raw_term: "sheesh",
    aliases: ["shiish"],
    example_usage: "Sheesh, la tenue est de fou.",
    short_definition: "Exclamation d’admiration / choc léger (wow 2.0).",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "medium",
    placement: "theme_pool",
    discovery_note: "Présent Le Bonbon 2025 ; plus oral/réseau que durable.",
  },
  {
    raw_term: "y’a pas H",
    aliases: ["ya pas H", "y a pas h"],
    example_usage: "Vas-y y’a pas H, on y va.",
    short_definition: "Y’a pas de souci / c’est clair, go.",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "medium",
    placement: "theme_pool",
    discovery_note: "FR oral ; vérifier graphie et scène.",
  },
];

/** Anglicismes à freiner ou cadrer pour une app FR. */
const FR_WEAK_OR_CADRE = [
  {
    concept_key: "ate",
    fr_fit: "weak",
    note: "Peu ancré oral FR hors niches EN ; garder watchlist.",
  },
  {
    concept_key: "glaze",
    fr_fit: "weak",
    note: "Niche EN récente ; pas prioritaire pool FR.",
  },
  {
    concept_key: "beige_flag",
    fr_fit: "medium",
    note: "Compris via red/green flag ; OK secondaire.",
  },
  {
    concept_key: "iykyk",
    fr_fit: "medium",
    note: "Plus initiés réseaux ; garder mais ne pas surpondérer.",
  },
  {
    concept_key: "touch_grass",
    fr_fit: "medium",
    note: "Anglicisme connu en ligne ; scènes pote OK.",
  },
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
  // also check surface near "pain" / "aura" already in pack
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
    human_decision:
      collision.exact
        ? "reject"
        : c.placement === "daily_friendly" || c.fr_fit === "strong"
          ? "approve"
          : c.fr_fit === "medium"
            ? "approve"
            : "watchlist",
    human_notes: c.discovery_note,
  });
}

const novelForMerge = rows.filter(
  (r) => r.novelty_status === "novel_candidate" && r.already_in_raw_signals === "no",
);

if (MERGE && novelForMerge.length) {
  const next = { ...existingSignals };
  next.notes =
    (next.notes || "") + " | FR-first seed " + new Date().toISOString().slice(0, 10);
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
      fr_fit: r.fr_fit,
      placement: r.placement,
      discovery_source: "seed_fr_first_discovery_v1",
    })),
  ];
  writeJson(signalsPath, next);
}

const stamp = stampIso();
const research = {
  generated_at: new Date().toISOString(),
  policy: "fr_first_app_orientation_v1",
  sources_note:
    "Veille assistée FR (TF1, Midi Libre, MagicMaman, MinutePunchline, Le Bonbon) — glossaires = indices, scènes = vérité.",
  principles: [
    "Prioriser FR hybride (verlan, cité, TikTok FR) pour l’app Tu Captes.",
    "Anglicismes OK s’ils circulent oralement en France avec scène crédible.",
    "Effets de mode (six-seven) : daily / tendances, pas saturation du pool.",
    "Éviter uniquement ce qui n’a aucune attestation FR utile pour 35–55.",
  ],
  weak_en_cadre: FR_WEAK_OR_CADRE,
  counts: {
    proposed: rows.length,
    novel: rows.filter((r) => r.novelty_status === "novel_candidate").length,
    approved_in_seed: rows.filter((r) => r.human_decision === "approve").length,
    merged: MERGE ? novelForMerge.length : 0,
  },
  rows,
};

writeJson(resolve(outDir, "fr-first-discovery-v1-latest.json"), research);
writeJson(resolve(outDir, `fr-first-discovery-v1-${stamp}.json`), research);
writeCsv(
  resolve(outDir, "fr-first-discovery-v1-latest.csv"),
  [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "short_definition",
    "aliases",
    "example_usage",
    "fr_fit",
    "placement",
    "novelty_status",
    "near_key",
    "authenticity_gate",
    "recommendation",
    "human_decision",
    "human_notes",
  ],
  rows,
);

console.log(JSON.stringify({ ok: true, counts: research.counts, merge: MERGE }, null, 2));
