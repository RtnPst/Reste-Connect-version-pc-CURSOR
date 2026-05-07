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
  culture_pop: {
    label: "Culture internet",
    short: "Culture internet",
    description:
      "Mèmes, gaming, musique, relations, tendances… le grand mix de la culture web.",
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
