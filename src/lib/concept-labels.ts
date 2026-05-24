import labels from "@/data/concept-labels-v1.json";

const LABELS = labels as Record<string, string>;

export function getConceptLabel(conceptKey: string | null | undefined): string | null {
  const key = conceptKey?.trim();
  if (!key) return null;
  return LABELS[key] ?? null;
}

/** Short player-facing excerpt (explanation fallback when no editorial label). */
export function excerptExplanation(text: string, maxLen = 220): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
