import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Star, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import {
  TOTAL_LEVELS,
  QUESTIONS_PER_LEVEL,
  RANKS,
  getRankForLevel,
  loadProgress,
  type LevelProgress,
} from "@/lib/levels";

export const Route = createFileRoute("/niveaux")({
  head: () => ({
    meta: [
      { title: "Parcours par niveaux — Reste connecté !" },
      {
        name: "description",
        content:
          "Franchissez les niveaux un à un et gagnez vos rangs : Bronze, Argent, Or, Platine, Diamant, Maître.",
      },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  const [progress, setProgress] = useState<LevelProgress>({ unlocked: 1, best: {} });

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-5xl py-8 sm:py-12">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">Votre parcours</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {QUESTIONS_PER_LEVEL} questions par niveau, tirées de tous les thèmes. Atteignez 70 %
            pour débloquer le suivant et gravir les rangs.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary font-bold">
            <Trophy className="size-5" />
            Niveau actuel : {progress.unlocked} / {TOTAL_LEVELS}
          </div>
        </div>

        {/* Légende des rangs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {RANKS.map((r) => (
            <span
              key={r.key}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border-2"
              style={{
                color: `var(--${r.colorVar})`,
                borderColor: `var(--${r.colorVar})`,
                backgroundColor: `color-mix(in oklab, var(--${r.colorVar}) 12%, transparent)`,
              }}
            >
              <span aria-hidden>{r.emoji}</span>
              {r.label} · N{r.fromLevel}-{r.toLevel}
            </span>
          ))}
        </div>

        {/* Grille des niveaux */}
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 md:grid-cols-6">
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((n) => {
            const rank = getRankForLevel(n);
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
                className={`relative rounded-2xl border-2 p-3 sm:p-4 aspect-square flex flex-col items-center justify-center text-center transition-all ${
                  isUnlocked
                    ? "hover:scale-[1.05] hover:shadow-[var(--shadow-card)] cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
                style={{
                  borderColor: isUnlocked ? `var(--${rank.colorVar})` : undefined,
                  backgroundColor: isUnlocked
                    ? `color-mix(in oklab, var(--${rank.colorVar}) 8%, var(--card))`
                    : undefined,
                }}
              >
                <span className="text-2xl mb-0.5" aria-hidden>
                  {rank.emoji}
                </span>
                <span className="text-xs font-bold opacity-70">Niveau</span>
                <span
                  className="text-2xl sm:text-3xl font-extrabold leading-none"
                  style={{ color: isUnlocked ? `var(--${rank.colorVar})` : undefined }}
                >
                  {n}
                </span>
                {!isUnlocked && (
                  <Lock
                    className="absolute top-2 right-2 size-4 text-muted-foreground"
                    aria-hidden
                  />
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
              <Link
                key={n}
                to="/niveau/$n"
                params={{ n: String(n) }}
                aria-label={`Niveau ${n} (${rank.label})`}
              >
                {content}
              </Link>
            ) : (
              <div key={n} aria-label={`Niveau ${n} verrouillé`}>
                {content}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
