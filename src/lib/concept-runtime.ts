type WithQuestionText = {
  question?: string | null;
};

function stripDiacritics(input: string): string {
  return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(input: string): string {
  const base = stripDiacritics(input).toLowerCase().replace(/['’`]/g, "");
  return base
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extractQuotedRoot(question: string): string | null {
  const direct = question.match(/^que\s+veut\s+dire\s+["“”«»]([^"“”«»]{1,80})["“”«»]\s*\??$/i);
  if (direct) return direct[1] ?? null;
  const firstQuoted = question.match(/["“”«»]([^"“”«»]{1,80})["“”«»]/);
  if (firstQuoted) return firstQuoted[1] ?? null;
  return null;
}

export function getQuestionConceptProxy(question: WithQuestionText): string | null {
  const raw = String(question.question ?? "").trim();
  if (!raw) return null;

  const quoted = extractQuotedRoot(raw);
  if (quoted) {
    const fromQuote = slugify(quoted);
    if (fromQuote.length >= 3) return fromQuote;
  }

  const normalized = raw
    .toLowerCase()
    .replace(/^qu['’]est-ce qu['’]?(un|une)?\s*/i, "")
    .replace(/^que\s+veut\s+dire\s*/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();
  const slug = slugify(normalized).split("_").slice(0, 4).join("_");
  if (slug.length < 4) return null;
  return slug;
}

export function wouldRepeatConceptTooSoon(
  conceptProxy: string | null,
  recentConcepts: Array<string | null>,
  windowSize: number,
): boolean {
  if (!conceptProxy) return false;
  const window = recentConcepts.slice(-Math.max(0, windowSize));
  return window.some((c) => c === conceptProxy);
}

export function rankCandidatesByConceptFreshness<T extends WithQuestionText>(
  candidates: T[],
  recentConcepts: Array<string | null>,
): T[] {
  if (candidates.length <= 1) return candidates;
  return [...candidates].sort((a, b) => {
    const aRepeat = wouldRepeatConceptTooSoon(getQuestionConceptProxy(a), recentConcepts, 4) ? 1 : 0;
    const bRepeat = wouldRepeatConceptTooSoon(getQuestionConceptProxy(b), recentConcepts, 4) ? 1 : 0;
    if (aRepeat !== bRepeat) return aRepeat - bRepeat;
    // preserve randomness on ties
    return Math.random() - 0.5;
  });
}

