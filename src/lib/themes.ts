export const THEMES = {
  vocabulaire: {
    label: "Vocabulaire des jeunes",
    short: "Vocabulaire",
    description: "Wesh, cringe, GOAT, sheesh, bail…",
    emoji: "💬",
    colorVar: "theme-vocab",
  },
  reseaux_sociaux: {
    label: "Réseaux sociaux & apps",
    short: "Réseaux sociaux",
    description: "TikTok, Snap, Insta, BeReal, Discord…",
    emoji: "📱",
    colorVar: "theme-social",
  },
  culture_pop: {
    label: "Culture pop actuelle",
    short: "Culture pop",
    description: "Chanteurs, séries, films, jeux vidéo",
    emoji: "🎬",
    colorVar: "theme-pop",
  },
  tech: {
    label: "Tech & numérique",
    short: "Tech",
    description: "IA, smartphone, sécurité, applis utiles",
    emoji: "💻",
    colorVar: "theme-tech",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const THEME_KEYS: ThemeKey[] = Object.keys(THEMES) as ThemeKey[];
