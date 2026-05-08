/**
 * Libellés badges pour l'UI uniquement (codes inchangés côté base).
 * Les noms / descriptions en base peuvent rester anciens : l'app affiche ces chaînes.
 *
 * Déblocage : les insertions dans `user_badges` sont faites côté Supabase (triggers sur
 * `quiz_attempts`, etc.) — l’app n’appelle pas `award_badge` depuis le client.
 */
export type BadgeUiCopy = {
  name: string;
  description: string;
  unlockHint: string;
};

const BADGE_UI: Record<string, BadgeUiCopy> = {
  first_quiz: {
    name: "Première game",
    description: "Un quiz terminé du début à la fin. T'étais pas obligé, t'as quand même cliqué.",
    unlockHint: "Termine un quiz jusqu'au bout (n'importe lequel).",
  },
  perfect_score: {
    name: "Sans faute",
    description: "10/10 sur un quiz thème. Zéro raté, full focus.",
    unlockHint: "Un quiz thème, score parfait. Chaud ?",
  },
  vocab_expert: {
    name: "Boss du vocab",
    description: "5 quiz Vocabulaire à 7+ / 10. Les mots n'ont plus peur de toi.",
    unlockHint: "5 quiz Vocabulaire avec au moins 7 bonnes réponses sur 10.",
  },
  social_expert: {
    name: "Dans le feed",
    description: "5 quiz Réseaux sociaux au même niveau. T'es au courant avant les autres.",
    unlockHint: "5 quiz Réseaux sociaux à 7+ / 10.",
  },
  pop_expert: {
    name: "Culture internet validée",
    description:
      "5 parties à 7+ / 10 sur les thèmes culture web (Gaming, Mèmes & trends, Relations) — les anciennes parties « Culture internet » comptent aussi.",
    unlockHint:
      "5 quiz à 7+ / 10 en cumulant Gaming, Mèmes & trends, Relations (ou d’anciennes parties enregistrées sous Culture internet).",
  },
  tech_expert: {
    name: "Tech & IA : validé",
    description: "5 quiz Tech & IA nickel. Le numérique, c'est ton terrain.",
    unlockHint: "5 quiz Tech & IA à 7+ / 10.",
  },
  streak_3: {
    name: "3 jours d'affilée",
    description: "Trois jours de suite sans ghost. Respect.",
    unlockHint: "Joue au moins un peu 3 jours d'affilée.",
  },
  streak_7: {
    name: "7 jours en série",
    description: "Une semaine pile. Les absents ont tort, toi t'es là.",
    unlockHint: "Même délire, mais 7 jours d'affilée.",
  },
};

const DEFAULT_UNLOCK = "Continue comme ça, un badge va tomber.";

export function getBadgeUiCopy(code: string): BadgeUiCopy | null {
  return BADGE_UI[code] ?? null;
}

export function badgeUnlockHintOrDefault(code: string): string {
  return BADGE_UI[code]?.unlockHint ?? DEFAULT_UNLOCK;
}
