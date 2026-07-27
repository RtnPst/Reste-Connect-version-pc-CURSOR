/**
 * Decade / époque packs — curated concept_keys for “Par époque” angle.
 * Maps calendar decades to FR-anchored vernacular (not platform eras).
 */

export type DecadeKey = "annees_90" | "annees_2000" | "annees_2010" | "maintenant";

export type DecadePack = {
  key: DecadeKey;
  label: string;
  short: string;
  description: string;
  conceptKeys: string[];
};

export const DECADE_PACKS: Record<DecadeKey, DecadePack> = {
  annees_90: {
    key: "annees_90",
    label: "Années 90",
    short: "90s",
    description: "SMS, meufs, thune — le parler d’avant les likes.",
    conceptKeys: [
      "thune",
      "wesh",
      "kiffer",
      "ouf",
      "daron",
      "daronne",
      "flemme",
      "relou",
      "bail",
      "carre",
      "dead",
      "peinard",
      "boloss",
      "cimer",
      "oklm",
      "taffer",
    ],
  },
  annees_2000: {
    key: "annees_2000",
    label: "Années 2000",
    short: "2000s",
    description: "MSN, verlan, boloss — l’internet qui parle français.",
    conceptKeys: [
      "boloss",
      "chelou",
      "venere",
      "seum",
      "relou",
      "ouf",
      "wesh",
      "ghoster",
      "crush",
      "bg",
      "charbonner",
      "waz",
      "tkt",
      "cimer",
      "hess",
      "belek",
    ],
  },
  annees_2010: {
    key: "annees_2010",
    label: "Années 2010",
    short: "2010s",
    description: "Snap, Insta, ratio — le fil social s’installe.",
    conceptKeys: [
      "ratio",
      "ghoster",
      "flex",
      "sus",
      "red_flag",
      "green_flag",
      "story",
      "seen",
      "dm",
      "fomo",
      "simp",
      "friendzone",
      "situationship",
      "banger",
      "valide",
      "matrixe",
      "stalker",
    ],
  },
  maintenant: {
    key: "maintenant",
    label: "Maintenant",
    short: "Aujourd’hui",
    description: "TikTok FR, nouchi, mèmes — ce qu’on entend en 2025–26.",
    conceptKeys: [
      "chokbar",
      "goumin",
      "mon_pain",
      "aura",
      "pnj",
      "six_seven",
      "askip",
      "wallah",
      "charo",
      "cringe",
      "sauce",
      "genance",
      "rizz",
      "delulu",
      "brainrot",
      "quoicoubeh",
      "ya_pas_h",
      "go",
      "jsp",
      "dz",
      "osef",
      "bader",
      "zerma",
      "miskine",
      "sah",
      "belek",
      "hess",
    ],
  },
};

export const DECADE_KEYS = Object.keys(DECADE_PACKS) as DecadeKey[];

export function isDecadeKey(value: string): value is DecadeKey {
  return value in DECADE_PACKS;
}
