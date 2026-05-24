import { QUESTIONS_PER_LEVEL, type LevelProgress } from "@/lib/levels";

export type PathNodeState = "completed" | "current" | "locked";

export function getPathNodeState(level: number, progress: LevelProgress): PathNodeState {
  if (level > progress.unlocked) return "locked";
  if (level === progress.unlocked) return "current";
  return "completed";
}

/** Soft mist on nodes far beyond the frontier. */
export function isPathNodeDistant(level: number, progress: LevelProgress): boolean {
  return level > progress.unlocked + 4;
}

export function getLevelStars(best: number): 0 | 1 | 2 | 3 {
  if (best >= QUESTIONS_PER_LEVEL) return 3;
  if (best >= 4) return 2;
  if (best >= Math.ceil(QUESTIONS_PER_LEVEL * 0.7)) return 1;
  return 0;
}
