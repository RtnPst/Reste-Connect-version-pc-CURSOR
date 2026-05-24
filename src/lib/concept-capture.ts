import { excerptExplanation, getConceptLabel } from "@/lib/concept-labels";

export type ConceptCaptureCopy = {
  /** Display name when concept_key maps to a label */
  conceptLabel: string | null;
  /** One sharp editorial line under the headline */
  editorialLine: string;
};

/** Player-facing copy for the capture beat (no score / performance tone). */
export function buildConceptCaptureCopy(
  conceptKey: string | null | undefined,
  explanation: string,
): ConceptCaptureCopy {
  const conceptLabel = getConceptLabel(conceptKey);
  const editorialLine = conceptLabel
    ? excerptExplanation(explanation, 110)
    : excerptExplanation(explanation, 150);
  return { conceptLabel, editorialLine };
}

/** First concept label from questions the player answered correctly (session recap echo). */
export function pickSessionCapturedConceptLabel(
  items: ReadonlyArray<{ conceptKey: string | null }>,
  answers: ReadonlyArray<{ chosen: number; correct: number }>,
): string | null {
  for (let i = 0; i < answers.length; i++) {
    if (answers[i].chosen !== answers[i].correct) continue;
    const label = getConceptLabel(items[i]?.conceptKey);
    if (label) return label;
  }
  return null;
}
