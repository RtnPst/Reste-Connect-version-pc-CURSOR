import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { PathTrail } from "@/components/PathTrail";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  TOTAL_LEVELS,
  QUESTIONS_PER_LEVEL,
  getEffectiveUnlockedLevel,
  getRankForLevel,
  loadProgress,
  mergeProgress,
  saveProgress,
  type LevelProgress,
} from "@/lib/levels";

export const Route = createFileRoute("/niveaux")({
  head: () => ({
    meta: [
      { title: "Le chemin — Tu captes ?" },
      {
        name: "description",
        content:
          "Avance étape par étape sur un fil culturel — progression calme, tous thèmes mélangés.",
      },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  const { user, profile } = useAuth();
  const [progress, setProgress] = useState<LevelProgress>({ unlocked: 1, best: {} });

  useEffect(() => {
    if (!user || !profile) {
      setProgress({ unlocked: 1, best: {} });
      return;
    }

    const merged = mergeProgress(loadProgress(), {
      max_unlocked_level: profile.max_unlocked_level,
      level_best_scores: profile.level_best_scores,
    });
    saveProgress(merged);
    setProgress(merged);
  }, [user, profile]);

  const frontier = getEffectiveUnlockedLevel(!!user, profile);
  const rankHere = getRankForLevel(frontier);

  return (
    <JourneyPage>
      <AppHeader />
      <main className="container mx-auto w-full max-w-lg flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-5 animate-fade-in">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">Sur le fil</p>
          <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Le chemin
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Tu avances sur une ligne d’étapes — pas un tableau de score. {QUESTIONS_PER_LEVEL} questions par
            passage, tous les angles du web.
          </p>
          <div className="journey-panel mt-4 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[11px] font-medium tracking-[0.1em] text-primary/75">Tu es ici</p>
            <p className="mt-1 text-base font-extrabold leading-snug text-foreground">
              {rankHere.label}
              <span className="font-medium text-muted-foreground"> · étape {frontier}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {frontier >= TOTAL_LEVELS
                ? "Tu as atteint l’horizon prévu — rejoue une étape si tu veux affiner."
                : "La suite se dévoile en douceur, une étape à la fois."}
            </p>
            <div className="journey-filament mt-2.5" aria-hidden>
              <span style={{ width: `${Math.round((frontier / TOTAL_LEVELS) * 100)}%` }} />
            </div>
          </div>
          {!user && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Sans compte, tu commences à l’étape 1. Connecte-toi pour retrouver ta position sur le chemin.
            </p>
          )}
        </header>

        <PathTrail progress={progress} frontierLevel={frontier} />

        <div className="mt-6 flex flex-col gap-2 pb-4">
          <Button asChild variant="accent" size="lg" className="w-full min-h-[52px]">
            <Link to="/niveau/$n" params={{ n: String(frontier) }}>
              Continuer l’étape {frontier}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-between" asChild>
            <Link to="/play">
              Retour au carrefour
              <ChevronRight className="size-4 opacity-70" aria-hidden />
            </Link>
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" asChild>
            <Link to="/parcours">Voir ton parcours</Link>
          </Button>
        </div>
      </main>
    </JourneyPage>
  );
}
