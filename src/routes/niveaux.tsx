import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Lock, Star } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/RankBadge";
import { useAuth } from "@/contexts/AuthContext";
import {
  TOTAL_LEVELS,
  QUESTIONS_PER_LEVEL,
  RANKS,
  getEffectiveUnlockedLevel,
  loadProgress,
  mergeProgress,
  saveProgress,
  type LevelProgress,
  type Rank,
} from "@/lib/levels";

export const Route = createFileRoute("/niveaux")({
  head: () => ({
    meta: [
      { title: "Parcours par niveaux — Tu captes ?" },
      {
        name: "description",
        content:
          "Avance palier par palier, tous thèmes mélangés — une progression calme, sans pression.",
      },
    ],
  }),
  component: LevelsPage,
});

function LevelCard({
  n,
  rank,
  progress,
}: {
  n: number;
  rank: Rank;
  progress: LevelProgress;
}) {
  const isUnlocked = n <= progress.unlocked;
  const best = progress.best[n] ?? 0;
  const stars =
    best >= QUESTIONS_PER_LEVEL
      ? 3
      : best >= 4
        ? 2
        : best >= Math.ceil(QUESTIONS_PER_LEVEL * 0.7)
          ? 1
          : 0;

  const content = (
    <div
      className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border p-3 text-center transition-colors duration-200 sm:p-3.5 ${
        isUnlocked
          ? "cursor-pointer border-border bg-card hover:border-primary/35"
          : "cursor-not-allowed border-border/60 bg-card/40 opacity-55"
      }`}
      style={
        isUnlocked
          ? {
              borderColor: `color-mix(in oklab, var(--${rank.colorVar}) 28%, var(--border))`,
            }
          : undefined
      }
    >
      <RankBadge rank={rank} level={n} size="sm" className="mb-1" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        N{n}
      </span>
      {!isUnlocked && (
        <Lock className="absolute top-2 right-2 size-3.5 text-muted-foreground" aria-hidden />
      )}
      {isUnlocked && stars > 0 && (
        <div className="mt-1 flex gap-0.5">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`size-3 ${s <= stars ? "fill-warning text-warning" : "text-muted-foreground/25"}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return isUnlocked ? (
    <Link to="/niveau/$n" params={{ n: String(n) }} aria-label={`Niveau ${n} (${rank.label})`}>
      {content}
    </Link>
  ) : (
    <div aria-label={`Niveau ${n}, verrouillé`}>{content}</div>
  );
}

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

  const current = getEffectiveUnlockedLevel(!!user, profile);

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full max-w-lg flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 animate-fade-in">
          <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Niveaux
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {QUESTIONS_PER_LEVEL} questions, tous les thèmes. Quatre bonnes réponses suffisent pour
            ouvrir la suite — à ton rythme.
          </p>
          <p className="mt-3 text-sm text-foreground/90">
            Tu es au niveau{" "}
            <span className="font-semibold text-primary">
              {current} / {TOTAL_LEVELS}
            </span>
          </p>
          {!user && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Sans compte, tu commences au niveau 1. Connecte-toi pour retrouver ta progression.
            </p>
          )}
        </header>

        <div className="space-y-8">
          {RANKS.map((rank) => {
            const levels = Array.from(
              { length: rank.toLevel - rank.fromLevel + 1 },
              (_, i) => rank.fromLevel + i,
            );
            const v = rank.colorVar;

            return (
              <section key={rank.key} aria-labelledby={`rank-heading-${rank.key}`}>
                <div
                  className="mb-3 rounded-xl border px-3 py-2.5 text-center"
                  style={{
                    borderColor: `color-mix(in oklab, var(--${v}) 24%, var(--border))`,
                    backgroundColor: `color-mix(in oklab, var(--${v}) 8%, var(--card))`,
                  }}
                >
                  <h2
                    id={`rank-heading-${rank.key}`}
                    title={rank.hint}
                    className="text-base font-bold tracking-tight sm:text-lg"
                    style={{ color: `var(--${v})` }}
                  >
                    {rank.label}
                    <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                      N{rank.fromLevel}–{rank.toLevel}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {levels.map((n) => (
                    <LevelCard key={n} n={n} rank={rank} progress={progress} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 pb-4">
          <Button variant="outline" className="w-full justify-between" asChild>
            <Link to="/play">
              Retour à Jouer
              <ChevronRight className="size-4 opacity-70" aria-hidden />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
