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
