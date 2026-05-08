export const THEMES = {
  vocabulaire: {
    label: "Vocabulaire",
    short: "Vocabulaire",
    description: "Argot, scans, expressions… capte-tu le langage du moment ?",
    emoji: "💬",
    colorVar: "theme-vocab",
  },
  reseaux_sociaux: {
    label: "Réseaux sociaux",
    short: "Réseaux sociaux",
    description: "Feeds, stories, lives, trends… tout ce qui circule en ligne.",
    emoji: "📱",
    colorVar: "theme-social",
  },
  gaming: {
    label: "Gaming",
    short: "Gaming",
    description: "Jeux, streams, références pad & clavier.",
    emoji: "🎮",
    colorVar: "theme-gaming",
  },
  trends_pop_culture: {
    label: "Mèmes & trends",
    short: "Mèmes & trends",
    description: "Viral, musique, drama léger — le bruit du web.",
    emoji: "✨",
    colorVar: "theme-trends",
  },
  relations_lifestyle: {
    label: "Relations & lifestyle",
    short: "Relations",
    description: "Love, situations, codes du crush et du quotidien connecté.",
    emoji: "💬",
    colorVar: "theme-relations",
  },
  culture_pop: {
    label: "Culture internet (historique)",
    short: "Culture internet",
    description:
      "Ancien regroupement — les tentatives enregistrées sous ce thème restent visibles dans tes stats.",
    emoji: "🌐",
    colorVar: "theme-pop",
  },
  tech: {
    label: "Tech & IA",
    short: "Tech & IA",
    description: "Smartphones, IA, applis, sécurité… le quotidien numérique.",
    emoji: "💻",
    colorVar: "theme-tech",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const THEME_KEYS: ThemeKey[] = Object.keys(THEMES) as ThemeKey[];

/** Entrées quiz / duel — sans culture_pop (legacy, pas de parcours dédié). */
export const PLAYABLE_THEME_KEYS = THEME_KEYS.filter(
  (k): k is Exclude<ThemeKey, "culture_pop"> => k !== "culture_pop",
);
