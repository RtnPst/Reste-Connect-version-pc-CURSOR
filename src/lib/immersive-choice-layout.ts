/** Max chars per choice to fit a 2×2 tactile grid without clipping. */
const COMPACT_MAX_CHOICE_LEN = 34;
/** Long questions keep a vertical stack so the grid has room. */
const COMPACT_MAX_QUESTION_LEN = 140;

/** Four short choices + readable question → 2×2 mobile cards; otherwise single column. */
export function shouldUseCompactChoiceGrid(choices: string[], questionText: string): boolean {
  if (choices.length !== 4) return false;
  if (questionText.trim().length > COMPACT_MAX_QUESTION_LEN) return false;
  return choices.every((c) => c.trim().length <= COMPACT_MAX_CHOICE_LEN);
}
