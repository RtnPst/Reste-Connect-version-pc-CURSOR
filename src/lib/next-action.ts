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
        label: "Continuer au niveau suivant",
        to: `/niveau/${level + 1}`,
        reason: "Bon rythme de progression, enchaîne maintenant.",
      };
    }
    return {
      label: "Rejouer ce niveau",
      to: `/niveau/${level}`,
      reason: "Renforcer ce palier avant d’avancer.",
    };
  }

  if (input.mode === "marathon") {
    const accuracy = input.total > 0 ? input.score / input.total : 0;
    if (accuracy >= 0.6 && input.score >= 8) {
      return {
        label: "Relancer un marathon",
        to: "/marathon",
        reason: "Bonne run, tente un nouveau record.",
      };
    }
    return {
      label: input.isLoggedIn ? "Reprendre le parcours" : "Lancer un quiz thème",
      to: input.isLoggedIn ? "/niveaux" : "/quiz",
      reason: "Session utile, passe sur un format plus structuré.",
    };
  }

  const percentage = input.total > 0 ? (input.score / input.total) * 100 : 0;
  if (input.isLoggedIn && percentage >= 70) {
    return {
      label: "Continuer ta progression",
      to: "/niveaux",
      reason: "Bon score, capitalise avec le mode niveaux.",
    };
  }
  return {
    label: "Essayer un autre thème",
    to: "/quiz",
    reason: "Varier les thèmes aide à progresser plus vite.",
  };
}

