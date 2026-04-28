// Système de niveaux & rangs pour le mode Parcours

export const QUESTIONS_PER_LEVEL = 5;
export const PASS_PERCENTAGE = 70; // % pour valider un niveau
export const TOTAL_LEVELS = 30;

export type Rank = {
  key: string;
  label: string;
  emoji: string;
  // Plage de niveaux couverte par ce rang (inclusif)
  fromLevel: number;
  toLevel: number;
  // Variable CSS de couleur (définie dans styles.css)
  colorVar: string;
};

export const RANKS: Rank[] = [
  {
    key: "bronze",
    label: "Bronze",
    emoji: "🥉",
    fromLevel: 1,
    toLevel: 5,
    colorVar: "rank-bronze",
  },
  {
    key: "argent",
    label: "Argent",
    emoji: "🥈",
    fromLevel: 6,
    toLevel: 10,
    colorVar: "rank-silver",
  },
  { key: "or", label: "Or", emoji: "🥇", fromLevel: 11, toLevel: 15, colorVar: "rank-gold" },
  {
    key: "platine",
    label: "Platine",
    emoji: "💠",
    fromLevel: 16,
    toLevel: 20,
    colorVar: "rank-platinum",
  },
  {
    key: "diamant",
    label: "Diamant",
    emoji: "💎",
    fromLevel: 21,
    toLevel: 25,
    colorVar: "rank-diamond",
  },
  {
    key: "maitre",
    label: "Maître",
    emoji: "👑",
    fromLevel: 26,
    toLevel: TOTAL_LEVELS,
    colorVar: "rank-master",
  },
];

export function getRankForLevel(level: number): Rank {
  return RANKS.find((r) => level >= r.fromLevel && level <= r.toLevel) ?? RANKS[0];
}

// Stockage local de la progression (fonctionne sans compte)
const STORAGE_KEY = "rc_levels_progress_v1";

export type LevelProgress = {
  // Plus haut niveau débloqué (1 = seul le 1er disponible)
  unlocked: number;
  // Détails par niveau : meilleur score
  best: Record<number, number>;
};

export function loadProgress(): LevelProgress {
  if (typeof window === "undefined") return { unlocked: 1, best: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, best: {} };
    const parsed = JSON.parse(raw) as LevelProgress;
    return { unlocked: Math.max(1, parsed.unlocked ?? 1), best: parsed.best ?? {} };
  } catch {
    return { unlocked: 1, best: {} };
  }
}

export function saveLevelResult(level: number, score: number): LevelProgress {
  const current = loadProgress();
  const total = QUESTIONS_PER_LEVEL;
  const percent = (score / total) * 100;
  const passed = percent >= PASS_PERCENTAGE;

  const next: LevelProgress = {
    unlocked: passed
      ? Math.max(current.unlocked, Math.min(level + 1, TOTAL_LEVELS))
      : current.unlocked,
    best: { ...current.best, [level]: Math.max(current.best[level] ?? 0, score) },
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

// Difficulté progressive : niveaux 1-10 facile, 11-20 moyen, 21+ difficile
export function getDifficultyForLevel(level: number): "facile" | "moyen" | "difficile" {
  if (level <= 10) return "facile";
  if (level <= 20) return "moyen";
  return "difficile";
}

// Paliers célébrés en mode Marathon
export const MARATHON_MILESTONES = [5, 10, 15, 25, 40, 60, 80, 100, 150, 200];

export function isMarathonMilestone(score: number): boolean {
  return MARATHON_MILESTONES.includes(score);
}
