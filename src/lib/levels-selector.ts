import { QUESTIONS_PER_LEVEL } from "@/lib/levels";
import {
  getQuestionConceptProxy,
  rankCandidatesByConceptFreshness,
  wouldRepeatConceptTooSoon,
} from "@/lib/concept-runtime";

type Difficulty = "facile" | "moyen" | "difficile";

type LevelQuestion = {
  id: string;
  theme: string;
  difficulty: Difficulty;
  question: string;
};

type DifficultyPlan = Record<Difficulty, number>;

const PLAN_BY_RANGE: { maxLevel: number; plan: DifficultyPlan }[] = [
  { maxLevel: 5, plan: { facile: 4, moyen: 1, difficile: 0 } },
  { maxLevel: 10, plan: { facile: 3, moyen: 2, difficile: 0 } },
  { maxLevel: 15, plan: { facile: 2, moyen: 3, difficile: 0 } },
  { maxLevel: 20, plan: { facile: 1, moyen: 3, difficile: 1 } },
  { maxLevel: 25, plan: { facile: 0, moyen: 3, difficile: 2 } },
  { maxLevel: 30, plan: { facile: 0, moyen: 2, difficile: 3 } },
];

const TARGET_ORDER: Difficulty[] = ["facile", "moyen", "difficile"];

const FALLBACK_ORDER: Record<Difficulty, Difficulty[]> = {
  facile: ["facile", "moyen", "difficile"],
  moyen: ["moyen", "facile", "difficile"],
  difficile: ["difficile", "moyen", "facile"],
};

export function getDifficultyPlanForLevel(level: number): DifficultyPlan {
  return PLAN_BY_RANGE.find((entry) => level <= entry.maxLevel)?.plan ?? PLAN_BY_RANGE[5].plan;
}

function getHardCapForLevel(level: number): number | null {
  if (level <= 10) return 1;
  if (level <= 20) return 2;
  return null;
}

function getLastResortOrder(level: number): Difficulty[] {
  if (level <= 20) return ["moyen", "facile", "difficile"];
  return ["difficile", "moyen", "facile"];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function selectLevelQuestions<T extends LevelQuestion>(
  pool: T[],
  level: number,
  totalWanted = QUESTIONS_PER_LEVEL,
): T[] {
  const plan = getDifficultyPlanForLevel(level);
  const hardCap = getHardCapForLevel(level);
  const themeCap = 2;

  const byDifficulty: Record<Difficulty, T[]> = {
    facile: [],
    moyen: [],
    difficile: [],
  };

  for (const q of pool) {
    byDifficulty[q.difficulty].push(q);
  }
  byDifficulty.facile = shuffle(byDifficulty.facile);
  byDifficulty.moyen = shuffle(byDifficulty.moyen);
  byDifficulty.difficile = shuffle(byDifficulty.difficile);

  const selected: T[] = [];
  const selectedIds = new Set<string>();
  const themeCounts = new Map<string, number>();
  const selectedConcepts = new Set<string>();
  let recentConcepts: Array<string | null> = [];
  let difficultCount = 0;

  const tryPick = (
    difficulty: Difficulty,
    enforceThemeCap: boolean,
    enforceConceptUniqInRun: boolean,
    enforceConceptRecency: boolean,
  ): T | null => {
    const ordered = rankCandidatesByConceptFreshness(byDifficulty[difficulty], recentConcepts);
    for (const q of ordered) {
      if (selectedIds.has(q.id)) continue;
      if (enforceThemeCap && (themeCounts.get(q.theme) ?? 0) >= themeCap) continue;
      if (q.difficulty === "difficile" && hardCap !== null && difficultCount >= hardCap) continue;
      const concept = getQuestionConceptProxy(q);
      if (enforceConceptUniqInRun && concept && selectedConcepts.has(concept)) continue;
      if (enforceConceptRecency && wouldRepeatConceptTooSoon(concept, recentConcepts, 3)) continue;
      return q;
    }
    return null;
  };

  const pickOne = (q: T) => {
    const concept = getQuestionConceptProxy(q);
    selected.push(q);
    selectedIds.add(q.id);
    themeCounts.set(q.theme, (themeCounts.get(q.theme) ?? 0) + 1);
    if (concept) selectedConcepts.add(concept);
    recentConcepts = [...recentConcepts, concept].slice(-6);
    if (q.difficulty === "difficile") difficultCount += 1;
  };

  // Primary fill: follow target composition with nearby fallback.
  for (const target of TARGET_ORDER) {
    let remaining = plan[target];
    for (const fallback of FALLBACK_ORDER[target]) {
      while (remaining > 0 && selected.length < totalWanted) {
        const candidate = tryPick(fallback, true, true, true);
        if (!candidate) break;
        pickOne(candidate);
        remaining -= 1;
      }
      if (remaining === 0 || selected.length >= totalWanted) break;
    }
  }

  // Last resort: relax theme cap only to still reach 5 questions.
  if (selected.length < totalWanted) {
    for (const fallback of getLastResortOrder(level)) {
      while (selected.length < totalWanted) {
        // staged relaxation: keep concept spacing first
        let candidate = tryPick(fallback, false, true, true);
        if (!candidate) candidate = tryPick(fallback, false, true, false);
        if (!candidate) candidate = tryPick(fallback, false, false, false);
        if (!candidate) break;
        pickOne(candidate);
      }
      if (selected.length >= totalWanted) break;
    }
  }

  return selected.slice(0, totalWanted);
}
