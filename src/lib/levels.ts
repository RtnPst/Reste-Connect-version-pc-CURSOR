// Système de niveaux & rangs pour le mode Parcours

export const QUESTIONS_PER_LEVEL = 5;
export const PASS_PERCENTAGE = 70; // % pour valider un niveau
export const TOTAL_LEVELS = 30;

export type Rank = {
  key: string;
  /** Nom court affiché (ton jeu / perso, pas « métal » classique). */
  label: string;
  /** Phrase optionnelle pour info-bulle / accessibilité. */
  hint?: string;
  /** Conservé pour toasts / anciennes chaînes ; l’UI niveaux préfère RankBadge. */
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
    label: "En découverte",
    hint: "Tu tournes les idées, tu prends le pouls du jeu.",
    emoji: "🥉",
    fromLevel: 1,
    toLevel: 5,
    colorVar: "rank-bronze",
  },
  {
    key: "argent",
    label: "Ça capte",
    hint: "Les repères se mettent en place, ça commence à coller.",
    emoji: "🥈",
    fromLevel: 6,
    toLevel: 10,
    colorVar: "rank-silver",
  },
  {
    key: "or",
    label: "Dans le flow",
    hint: "Tu enchaînes sans forcer, comme si le fil était bon.",
    emoji: "🥇",
    fromLevel: 11,
    toLevel: 15,
    colorVar: "rank-gold",
  },
  {
    key: "platine",
    label: "Bien à jour",
    hint: "Tu surfes sur l’actu et les usages sans te perdre.",
    emoji: "💠",
    fromLevel: 16,
    toLevel: 20,
    colorVar: "rank-platinum",
  },
  {
    key: "diamant",
    label: "Ultra connecté",
    hint: "Peu de questions te surprennent encore.",
    emoji: "💎",
    fromLevel: 21,
    toLevel: 25,
    colorVar: "rank-diamond",
  },
  {
    key: "maitre",
    label: "Maître du jeu",
    hint: "Tu maîtrises le parcours de bout en bout.",
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

export function saveProgress(progress: LevelProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Niveau max débloqué côté UI : sans compte → toujours 1 (pas de progression « fantôme » du localStorage).
 * Connecté → fusion local + profil Supabase.
 */
export function getEffectiveUnlockedLevel(
  isLoggedIn: boolean,
  profile: { max_unlocked_level?: number | null; level_best_scores?: unknown } | null | undefined,
): number {
  if (!isLoggedIn || !profile) return 1;
  return mergeProgress(loadProgress(), {
    max_unlocked_level: profile.max_unlocked_level,
    level_best_scores: profile.level_best_scores,
  }).unlocked;
}

export function mergeProgress(
  local: LevelProgress,
  remote?: { max_unlocked_level?: number | null; level_best_scores?: unknown } | null,
): LevelProgress {
  if (!remote) return local;

  const remoteUnlocked = Math.max(1, remote.max_unlocked_level ?? 1);
  const remoteBestRaw =
    remote.level_best_scores && typeof remote.level_best_scores === "object"
      ? (remote.level_best_scores as Record<string, unknown>)
      : {};

  const mergedBest: Record<number, number> = { ...local.best };
  for (const [k, v] of Object.entries(remoteBestRaw)) {
    const level = Number(k);
    if (!Number.isFinite(level) || level < 1) continue;
    const score = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(score)) continue;
    mergedBest[level] = Math.max(mergedBest[level] ?? 0, score);
  }

  return {
    unlocked: Math.max(local.unlocked, remoteUnlocked),
    best: mergedBest,
  };
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
  saveProgress(next);
  return next;
}

export function getPassRequiredCorrect(totalQuestions: number): number {
  return Math.ceil((PASS_PERCENTAGE / 100) * totalQuestions);
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
