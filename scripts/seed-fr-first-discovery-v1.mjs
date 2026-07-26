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
    raw_term: "askip",
    aliases: ["à ce qu’il paraît", "askip que"],
    example_usage: "Askip il l’a ghost depuis samedi.",
    short_definition: "Apparemment / à ce qu’il paraît.",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Abréviation FR ultra courante SMS / Snap — cœur cible 35–55.",
  },
  {
    raw_term: "wallah",
    aliases: ["walpa", "wallah je te jure"],
    example_usage: "Wallah j’ai rien dit.",
    short_definition: "Serment / affirmation forte (« je te jure »).",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Oral cité FR ; variante walpa. Scène famille / pote.",
  },
  {
    raw_term: "jsp",
    aliases: ["jsp fréro", "je sais pas"],
    example_usage: "Tu viens ? — Jsp.",
    short_definition: "Je ne sais pas (abrégé).",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "SMS FR basique — utile pour décoder le fil sans jargon US.",
  },
  {
    raw_term: "charo",
    aliases: ["charognard", "gros charo"],
    example_usage: "Ce mec est un charo.",
    short_definition: "Personne qui enchaîne les conquêtes / trop « chasse ».",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR ado / Parents.fr & glossaires 2025 — scène relationnelle claire.",
  },
  {
    raw_term: "cringe",
    aliases: ["c’est cringe", "cringe total"],
    example_usage: "Son discours était trop cringe.",
    short_definition: "Gênant / malaisant au point d’être inconfortable.",
    suggested_theme: "culture_pop",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Anglicisme mais oral FR massif — garder avec scènes FR.",
  },
  {
    raw_term: "sauce",
    aliases: ["dans la sauce", "être saucé", "il est saucé"],
    example_usage: "J’ai perdu mon tel, j’suis dans la sauce.",
    short_definition: "Dans la galère / embêté ; « saucé » = sous le charme.",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Deux sens FR (galère vs crush) — excellent piège quiz.",
  },
  {
    raw_term: "gênance",
    aliases: ["c’est la gênance", "grosse gênance"],
    example_usage: "Il a parlé trop fort : c’est la gênance.",
    short_definition: "Situation très gênante / malaise collectif.",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "seasonal",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR oral TikTok / presse régionale — proche de cringe mais natif.",
  },
  {
    raw_term: "charbonner",
    aliases: ["je charbonne", "charbon"],
    example_usage: "J’ai charbonné tout le week-end pour réviser.",
    short_definition: "Travailler dur / enchaîner le travail.",
    suggested_theme: "vocabulaire",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR cité / rap / ado — pas un anglicisme.",
  },
  {
    raw_term: "daron",
    aliases: ["daronne", "les darons"],
    example_usage: "Mon daron est pas content.",
    short_definition: "Père (daronne = mère) ; les parents.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Verlan / argot FR classique encore vivant.",
  },
  {
    raw_term: "bg",
    aliases: ["beau gosse", "c’est un bg"],
    example_usage: "T’as vu le nouveau ? Il est bg.",
    short_definition: "Beau gosse / quelqu’un d’attirant ou stylé.",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Abréviation FR scolaire / Snap — prioritaire pool FR.",
  },
  {
    raw_term: "relou",
    aliases: ["trop relou", "il est relou"],
    example_usage: "Arrête, t’es relou.",
    short_definition: "Lourd / agaçant / pénible (verlan de « lourd »).",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Verlan FR incontournable pour le public cible.",
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
    discovery_note: "FR oral ; déjà en discovery — à shipper en questions.",
  },
  {
    raw_term: "flemme",
    aliases: ["j’ai la flemme", "grosse flemme"],
    example_usage: "J’ai la flemme de sortir.",
    short_definition: "Pas envie / paresse du moment.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR quotidien — label déjà en catalogue, manquait le live.",
  },
  {
    raw_term: "osef",
    aliases: ["on s’en fout", "osef total"],
    example_usage: "Il a liké ? Osef.",
    short_definition: "On s’en fout / ça n’a aucune importance.",
    suggested_theme: "vocabulaire",
    trend_freshness: "evergreen",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "Abréviation FR chat — très utile pour 35–55.",
  },
  {
    raw_term: "quoicoubeh",
    aliases: ["quoi coubeh", "quoicoubehhhh"],
    example_usage: "Il répond juste « quoicoubeh » pour troll.",
    short_definition: "Réplique absurde / mème ado (proche six-seven en esprit).",
    suggested_theme: "trends_pop_culture",
    trend_freshness: "recent",
    trend_durability: "micro_trend",
    fr_fit: "meme_mode",
    placement: "daily_friendly",
    discovery_note: "Classique FR cour de récré — daily / tendances, pas 10 Q pool.",
  },
  {
    raw_term: "go",
    aliases: ["sa go", "gow", "ma go"],
    example_usage: "C’est sa go.",
    short_definition: "Petite amie / copine.",
    suggested_theme: "relations_lifestyle",
    trend_freshness: "recent",
    trend_durability: "durable",
    fr_fit: "strong",
    placement: "theme_pool",
    discovery_note: "FR ado (≠ anglais « go ») — piège de sens utile.",
  },
];

/** Anglicismes à freiner ou cullés du live FR. */
const FR_WEAK_OR_CADRE = [
  {
    concept_key: "ate",
    fr_fit: "weak",
    note: "Peu ancré oral FR hors niches EN ; watchlist.",
  },
  {
    concept_key: "glaze",
    fr_fit: "weak",
    note: "Niche EN récente ; pas prioritaire pool FR.",
  },
  {
    concept_key: "iykyk",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — trop initiés EN.",
  },
  {
    concept_key: "touch_grass",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — anglicisme peu oral FR.",
  },
  {
    concept_key: "locked_in",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — slang US.",
  },
  {
    concept_key: "soft_launch",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — jargon dating EN.",
  },
  {
    concept_key: "high_key",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "low_key",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "based",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — niche EN.",
  },
  {
    concept_key: "boujee",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "breadcrumbing",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — jargon psy EN.",
  },
  {
    concept_key: "lit",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "salty",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "side_eye",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "texting",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — pas un code culturel FR.",
  },
  {
    concept_key: "triggered",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "no_cap",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — préférer scènes FR (wallah, askip…).",
  },
  {
    concept_key: "love_bombing",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "double_text",
    fr_fit: "weak",
    note: "Cull live 2026-07-27.",
  },
  {
    concept_key: "npc",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — préférer label FR PNJ.",
  },
  {
    concept_key: "sheesh",
    fr_fit: "weak",
    note: "Cull live 2026-07-27 — moins ancré que chokbar / sheesh US.",
  },
  {
    concept_key: "beige_flag",
    fr_fit: "medium",
    note: "Compris via red/green flag ; OK secondaire.",
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
        : c.placement === "daily_friendly" || c.fr_fit === "strong" || c.fr_fit === "medium"
          ? "approve"
          : "watchlist",
    human_notes: c.discovery_note,
  });
}

const stamp = stampIso();
const doc = {
  generated_at: new Date().toISOString(),
  policy: "fr_first_app_orientation_v1",
  sources_note:
    "Veille assistée FR (Figaro, Parents.fr, La Montagne, MinutePunchline, France Inter) — glossaires = indices, scènes = vérité.",
  principles: [
    "Prioriser FR hybride (verlan, cité, TikTok FR) pour l’app Tu Captes.",
    "Anglicismes OK s’ils circulent oralement en France avec scène crédible.",
    "Effets de mode (six-seven, quoicoubeh) : daily / tendances, pas saturation du pool.",
    "Éviter / cull ce qui n’a aucune attestation FR utile pour 35–55.",
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
      source: "fr_first_discovery_v1",
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

console.log(
  JSON.stringify(
    {
      ok: true,
      counts: doc.counts,
      merge: MERGE,
    },
    null,
    2,
  ),
);
