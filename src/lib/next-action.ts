export type NextActionMode = "theme" | "marathon" | "level";

export type NextActionInput = {
  mode: NextActionMode;
  isLoggedIn: boolean;
  score: number;
  total: number;
  level?: number;
  totalLevels?: number;
  passed?: boolean;
};

export type NextActionSuggestion = {
  label: string;
  to: string;
  reason: string;
};

export function getNextActionSuggestion(input: NextActionInput): NextActionSuggestion {
  if (input.mode === "level") {
    const level = input.level ?? 1;
    const totalLevels = input.totalLevels ?? level;
    const passed =
      input.passed ?? (input.total > 0 ? (input.score / input.total) * 100 >= 70 : false);
    if (passed && level < totalLevels) {
      return {
        label: "Étape suivante",
        to: `/niveau/${level + 1}`,
        reason: "La prochaine étape du chemin t’attend.",
      };
    }
    return {
      label: "Revoir ce niveau",
      to: `/niveau/${level}`,
      reason: "Tu peux repasser sur ce fil sans te presser.",
    };
  }

  if (input.mode === "marathon") {
    const accuracy = input.total > 0 ? input.score / input.total : 0;
    if (accuracy >= 0.6 && input.score >= 8) {
      return {
        label: "Nouvelle session marathon",
        to: "/marathon",
        reason: "Beau fil — une autre session si ça te dit.",
      };
    }
    return {
      label: input.isLoggedIn ? "Le chemin" : "Choisir un thème",
      to: input.isLoggedIn ? "/niveaux" : "/quiz",
      reason: "Reprends le fil sur une ligne d’étapes.",
    };
  }

  const percentage = input.total > 0 ? (input.score / input.total) * 100 : 0;
  if (input.isLoggedIn && percentage >= 70) {
    return {
      label: "Le chemin",
      to: "/niveaux",
      reason: "Une autre lecture : avance étape par étape sur le fil.",
    };
  }
  return {
    label: "Changer d’angle",
    to: "/quiz",
    reason: "Un autre thème, une autre lecture du web.",
  };
}

