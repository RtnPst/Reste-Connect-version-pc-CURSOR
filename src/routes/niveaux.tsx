import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Star, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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
          "Monte les niveaux un par un, des paliers En découverte à Maître du jeu, mélange tous les thèmes.",
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
      className={`relative rounded-2xl border p-3 sm:p-4 aspect-square flex flex-col items-center justify-center text-center transition-[transform,box-shadow,border-color] duration-200 ${
        isUnlocked
          ? "hover:scale-[1.02] hover:shadow-md cursor-pointer shadow-sm"
          : "opacity-50 cursor-not-allowed border-border"
      }`}
      style={{
        borderColor: isUnlocked ? `color-mix(in oklab, var(--${rank.colorVar}) 45%, var(--border))` : undefined,
        backgroundColor: isUnlocked
          ? `color-mix(in oklab, var(--${rank.colorVar}) 7%, var(--card))`
          : undefined,
      }}
    >
      <RankBadge rank={rank} level={n} size="sm" className="mb-1.5" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Niveau
      </span>
      {!isUnlocked && (
        <Lock className="absolute top-2 right-2 size-4 text-muted-foreground" aria-hidden />
      )}
      {isUnlocked && stars > 0 && (
        <div className="flex gap-0.5 mt-1">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`size-3 ${s <= stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
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

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">Mode niveaux</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {QUESTIONS_PER_LEVEL} questions mélangées (tous les thèmes). Fais au moins 4/5 bonnes
            réponses pour déverrouiller le suivant et grimper dans les rangs.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary font-bold">
            <Trophy className="size-5" />
            Tu es au niveau {getEffectiveUnlockedLevel(!!user, profile)} / {TOTAL_LEVELS}
          </div>
          {!user && (
            <p className="mt-4 max-w-xl mx-auto text-sm text-muted-foreground">
              Sans compte, tu commences au niveau 1. Connecte-toi pour récupérer ta progression
              enregistrée sur ton profil.
            </p>
          )}
        </div>

        <div className="space-y-10 sm:space-y-12">
          {RANKS.map((rank) => {
            const levels = Array.from(
              { length: rank.toLevel - rank.fromLevel + 1 },
              (_, i) => rank.fromLevel + i,
            );
            const v = rank.colorVar;

            return (
              <section key={rank.key} aria-labelledby={`rank-heading-${rank.key}`}>
                {/* Même largeur pour titre + grille (évite le décalage titre centré / grille pleine largeur) ; 5 cols sur md car chaque palier = 5 niveaux */}
                <div className="mx-auto w-full max-w-xl sm:max-w-2xl lg:max-w-3xl">
                  <div
                    className="mb-5 w-full rounded-2xl border px-4 py-3.5 text-center sm:px-6 sm:py-4"
                    style={{
                      borderColor: `color-mix(in oklab, var(--${v}) 38%, var(--border))`,
                      background: `linear-gradient(
                        165deg,
                        color-mix(in oklab, var(--${v}) 16%, var(--card)) 0%,
                        color-mix(in oklab, var(--${v}) 6%, var(--card)) 100%
                      )`,
                      boxShadow: `
                        inset 0 1px 0 color-mix(in oklab, white 14%, transparent),
                        0 6px 28px -10px color-mix(in oklab, var(--${v}) 28%, transparent)
                      `,
                    }}
                  >
                    <h2
                      id={`rank-heading-${rank.key}`}
                      title={rank.hint}
                      className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-xl font-bold tracking-tight sm:text-2xl"
                      style={{
                        color: `var(--${v})`,
                        textShadow: `
                          0 0 20px color-mix(in oklab, var(--${v}) 32%, transparent),
                          0 1px 0 color-mix(in oklab, var(--${v}) 20%, transparent)
                        `,
                      }}
                    >
                      <span>{rank.label}</span>
                      <span className="text-base font-semibold text-foreground/70 sm:text-lg">
                        (N{rank.fromLevel}–{rank.toLevel})
                      </span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-5">
                    {levels.map((n) => (
                      <LevelCard key={n} n={n} rank={rank} progress={progress} />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
