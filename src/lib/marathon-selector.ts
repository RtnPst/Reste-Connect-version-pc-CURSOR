type Difficulty = "facile" | "moyen" | "difficile";
import {
  getQuestionConceptProxy,
  rankCandidatesByConceptFreshness,
  wouldRepeatConceptTooSoon,
} from "@/lib/concept-runtime";

type MarathonQuestion = {
  id: string;
  theme: string;
  difficulty: Difficulty;
  question: string;
};

export type MarathonSelectorState = {
  answeredCount: number;
  streak: number;
  recentQuestionIds: string[];
  recentThemes: string[];
  recentDifficulties: Difficulty[];
  recentMisses: boolean[];
  recentConcepts: Array<string | null>;
};

const RECENT_ID_WINDOW = 20;
const RECENT_THEME_WINDOW = 5;
const RECENT_DIFF_WINDOW = 3;
const RECENT_MISS_WINDOW = 3;
const RECENT_CONCEPT_WINDOW = 8;

function slotForAnsweredCount(answeredCount: number): number {
  return (answeredCount % 8) + 1;
}

function waveForAnsweredCount(answeredCount: number): number {
  return Math.floor(answeredCount / 8);
}

function basePreferenceForSlot(slot: number): Difficulty[] {
  switch (slot) {
    case 1:
      return ["facile", "moyen", "difficile"]; // warm-up
    case 2:
      return ["facile", "moyen", "moyen", "difficile"]; // warm-up
    case 3:
      return ["moyen", "facile", "difficile"]; // pressure rise
    case 4:
      return ["moyen", "difficile", "facile"]; // pressure rise
    case 5:
      return ["moyen", "difficile", "difficile", "facile"]; // pressure rise
    case 6:
      return ["difficile", "moyen", "facile"]; // danger card
    case 7:
      return ["moyen", "facile", "difficile"]; // recovery
    case 8:
    default:
      return ["facile", "moyen", "difficile"]; // recovery
  }
}

function appendBounded<T>(items: T[], value: T, maxSize: number): T[] {
  const next = [...items, value];
  if (next.length <= maxSize) return next;
  return next.slice(next.length - maxSize);
}

export function buildNextMarathonState(
  state: MarathonSelectorState,
  answeredQuestion: { id: string; theme: string; difficulty: Difficulty; question: string },
  wasCorrect: boolean,
): MarathonSelectorState {
  const concept = getQuestionConceptProxy(answeredQuestion);
  return {
    answeredCount: state.answeredCount + 1,
    streak: wasCorrect ? state.streak + 1 : 0,
    recentQuestionIds: appendBounded(state.recentQuestionIds, answeredQuestion.id, RECENT_ID_WINDOW),
    recentThemes: appendBounded(state.recentThemes, answeredQuestion.theme, RECENT_THEME_WINDOW),
    recentDifficulties: appendBounded(
      state.recentDifficulties,
      answeredQuestion.difficulty,
      RECENT_DIFF_WINDOW,
    ),
    recentMisses: appendBounded(state.recentMisses, !wasCorrect, RECENT_MISS_WINDOW),
    recentConcepts: appendBounded(state.recentConcepts, concept, RECENT_CONCEPT_WINDOW),
  };
}

function isThemeClumped(theme: string, recentThemes: string[]): boolean {
  const count = recentThemes.filter((t) => t === theme).length;
  return count >= 2;
}

function shouldBlockHardFairness(state: MarathonSelectorState): boolean {
  const hardRecent = state.recentDifficulties.filter((d) => d === "difficile").length;
  const inEarlyGame = state.answeredCount < 12;
  if (inEarlyGame && hardRecent >= 1) return true;
  return hardRecent >= 2;
}

function hasMissHeavyPattern(state: MarathonSelectorState): boolean {
  return state.recentMisses.filter(Boolean).length >= 2;
}

function getPreference(state: MarathonSelectorState): Difficulty[] {
  const slot = slotForAnsweredCount(state.answeredCount);
  const wave = waveForAnsweredCount(state.answeredCount);
  const escalation = Math.min(2, Math.floor(wave / 2)); // slight escalation every 2 waves
  const highStreakBoost = state.streak >= 6 && slot === 6;
  const missHeavyRecovery = hasMissHeavyPattern(state);

  if (missHeavyRecovery) {
    return ["moyen", "facile", "difficile"];
  }

  const base = [...basePreferenceForSlot(slot)];

  if (slot >= 4 && slot <= 6 && escalation > 0) {
    for (let i = 0; i < escalation; i += 1) {
      base.unshift("difficile");
    }
  }
  if (highStreakBoost) {
    base.unshift("difficile");
  }

  return base;
}

function pickByPreference<T extends MarathonQuestion>(
  pool: T[],
  preference: Difficulty[],
  options: {
    blockRecentIds: boolean;
    blockThemeClump: boolean;
    blockHardFairness: boolean;
    blockConceptRecency: boolean;
    recentQuestionIds: string[];
    recentThemes: string[];
    recentConcepts: Array<string | null>;
  },
): T | null {
  for (const difficulty of preference) {
    const candidates = rankCandidatesByConceptFreshness(
      pool.filter((q) => {
      if (q.difficulty !== difficulty) return false;
      if (options.blockRecentIds && options.recentQuestionIds.includes(q.id)) return false;
      if (options.blockThemeClump && isThemeClumped(q.theme, options.recentThemes)) return false;
      if (options.blockHardFairness && q.difficulty === "difficile") return false;
      if (
        options.blockConceptRecency &&
        wouldRepeatConceptTooSoon(getQuestionConceptProxy(q), options.recentConcepts, 4)
      ) {
        return false;
      }
      return true;
    }),
      options.recentConcepts,
    );
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    }
  }
  return null;
}

export function selectNextMarathonQuestion<T extends MarathonQuestion>(
  pool: T[],
  state: MarathonSelectorState,
): T | null {
  if (pool.length === 0) return null;

  const preference = getPreference(state);
  const blockHardFairness = shouldBlockHardFairness(state);

  // Pass 1: strict (recency + anti-clump + fairness)
  const strict = pickByPreference(pool, preference, {
    blockRecentIds: true,
    blockThemeClump: true,
    blockHardFairness,
    blockConceptRecency: true,
    recentQuestionIds: state.recentQuestionIds,
    recentThemes: state.recentThemes,
    recentConcepts: state.recentConcepts,
  });
  if (strict) return strict;

  // Pass 2: relax theme anti-clump first (as requested).
  const relaxTheme = pickByPreference(pool, preference, {
    blockRecentIds: true,
    blockThemeClump: false,
    blockHardFairness,
    blockConceptRecency: true,
    recentQuestionIds: state.recentQuestionIds,
    recentThemes: state.recentThemes,
    recentConcepts: state.recentConcepts,
  });
  if (relaxTheme) return relaxTheme;

  // Pass 3: relax concept spacing before touching fairness.
  const relaxConcept = pickByPreference(pool, preference, {
    blockRecentIds: true,
    blockThemeClump: false,
    blockHardFairness,
    blockConceptRecency: false,
    recentQuestionIds: state.recentQuestionIds,
    recentThemes: state.recentThemes,
    recentConcepts: state.recentConcepts,
  });
  if (relaxConcept) return relaxConcept;

  // Pass 4: relax fairness guard only if needed to keep flow moving.
  const relaxFairness = pickByPreference(pool, preference, {
    blockRecentIds: true,
    blockThemeClump: false,
    blockHardFairness: false,
    blockConceptRecency: false,
    recentQuestionIds: state.recentQuestionIds,
    recentThemes: state.recentThemes,
    recentConcepts: state.recentConcepts,
  });
  if (relaxFairness) return relaxFairness;

  // Pass 5: final fallback, allow recent IDs to guarantee progress.
  const any = pickByPreference(pool, preference, {
    blockRecentIds: false,
    blockThemeClump: false,
    blockHardFairness: false,
    blockConceptRecency: false,
    recentQuestionIds: state.recentQuestionIds,
    recentThemes: state.recentThemes,
    recentConcepts: state.recentConcepts,
  });
  if (any) return any;

  return pool[Math.floor(Math.random() * pool.length)];
}

