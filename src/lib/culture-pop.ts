import culturePopQuestionTags from "@/data/culture-pop-question-tags.json";

export const CULTURE_POP_PISTE_SLUGS = ["gaming", "relations", "musique", "internet"] as const;
export type CulturePopPisteSlug = (typeof CULTURE_POP_PISTE_SLUGS)[number];

/** Pistes affichables (hors « mix » = pas de param). */
export const CULTURE_INTERNET_PISTES: readonly {
  slug: CulturePopPisteSlug;
  label: string;
  hint: string;
}[] = [
  {
    slug: "internet",
    label: "Mèmes & trends",
    hint: "Mèmes, viral, culture web large.",
  },
  {
    slug: "gaming",
    label: "Gaming",
    hint: "Jeux, streams, références pad & clavier.",
  },
  {
    slug: "musique",
    label: "Musique",
    hint: "Artistes, sons, scènes et drama léger.",
  },
  {
    slug: "relations",
    label: "Relations",
    hint: "Love, situations, codes du crush.",
  },
] as const;

const tagsRecord = culturePopQuestionTags as Record<string, CulturePopPisteSlug>;

export function parseCulturePopPisteFromSearch(raw: Record<string, unknown>): {
  piste?: CulturePopPisteSlug;
} {
  const p = raw.piste;
  if (typeof p !== "string") return {};
  const lower = p.trim().toLowerCase();
  if ((CULTURE_POP_PISTE_SLUGS as readonly string[]).includes(lower)) {
    return { piste: lower as CulturePopPisteSlug };
  }
  return {};
}

export function getCulturePopPisteForQuestion(question: string): CulturePopPisteSlug | null {
  const key = question.trim();
  const tag = tagsRecord[key];
  return tag ?? null;
}

export function culturePopPisteLabel(slug: CulturePopPisteSlug): string {
  return CULTURE_INTERNET_PISTES.find((p) => p.slug === slug)?.label ?? slug;
}

/** Petit repère visuel dans l’en-tête du quiz (Culture internet + piste). */
const PISTE_HEADER_EMOJI: Record<CulturePopPisteSlug, string> = {
  internet: "🌐",
  gaming: "🎮",
  musique: "🎵",
  relations: "💬",
};

export function culturePopPisteEmoji(slug: CulturePopPisteSlug): string {
  return PISTE_HEADER_EMOJI[slug] ?? "";
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pioche `count` questions : d'abord la piste demandée, puis complète avec le reste du pool.
 * `piste` absent = mélange aléatoire sur tout le pool (appeler avec pool déjà de taille voulue).
 */
export function pickCulturePopQuestions<Q extends { question: string }>(
  pool: Q[],
  piste: CulturePopPisteSlug | undefined,
  count: number,
): Q[] {
  if (!piste) {
    return shuffleInPlace([...pool]).slice(0, count);
  }
  const shuffled = shuffleInPlace([...pool]);
  const primary: Q[] = [];
  const rest: Q[] = [];
  for (const q of shuffled) {
    if (getCulturePopPisteForQuestion(q.question) === piste) primary.push(q);
    else rest.push(q);
  }
  const out: Q[] = [];
  for (const q of primary) {
    if (out.length >= count) break;
    out.push(q);
  }
  for (const q of rest) {
    if (out.length >= count) break;
    out.push(q);
  }
  return out.slice(0, count);
}
