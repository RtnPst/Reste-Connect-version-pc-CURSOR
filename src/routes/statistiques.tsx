import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Flame, Target, Trophy, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";

export const Route = createFileRoute("/statistiques")({
  head: () => ({
    meta: [
      { title: "Tes stats — Tu captes ?" },
      {
        name: "description",
        content:
          "Scores, thèmes où tu cartonnes, série de jours, badges : tout ton game en un coup d'œil.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatsPage,
});

type Attempt = {
  id: string;
  theme: string | null;
  score: number;
  total_questions: number;
  completed_at: string;
};

function StatsPage() {
  const { profile } = useAuth();
  const { user, loading } = useRequireAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, theme, score, total_questions, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      setAttempts((data as Attempt[]) ?? []);
      setLoadingData(false);
    })();
  }, [user]);

  if (loading || loadingData || !profile) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>On sort tes stats…</p>
        </main>
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.reduce((s, a) => s + a.score, 0);
  const totalQuestions = attempts.reduce((s, a) => s + a.total_questions, 0);
  const avgScore = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const perfect = attempts.filter((a) => a.score === a.total_questions).length;

  // Stats per theme
  const byTheme: Record<ThemeKey, { count: number; correct: number; total: number }> = {
    vocabulaire: { count: 0, correct: 0, total: 0 },
    reseaux_sociaux: { count: 0, correct: 0, total: 0 },
    gaming: { count: 0, correct: 0, total: 0 },
    trends_pop_culture: { count: 0, correct: 0, total: 0 },
    relations_lifestyle: { count: 0, correct: 0, total: 0 },
    culture_pop: { count: 0, correct: 0, total: 0 },
    tech: { count: 0, correct: 0, total: 0 },
  };
  for (const a of attempts) {
    if (!a.theme) continue;
    const slot = byTheme[a.theme as ThemeKey];
    if (!slot) continue;
    slot.count += 1;
    slot.correct += a.score;
    slot.total += a.total_questions;
  }

  const last10 = attempts.slice(0, 10).reverse();
  const maxScore = 10;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-4xl flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3">
            <BarChart3 className="text-primary size-8" />
            Tes stats
          </h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/parcours">
              <ArrowLeft /> Parcours
            </Link>
          </Button>
        </div>

        {totalAttempts === 0 ? (
          <div className="bg-card rounded-3xl border-2 border-border p-10 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              Rien enregistré pour l’instant. Un quiz thème ou la question du jour, et ça démarre.
            </p>
            <Button asChild variant="accent" size="lg">
              <Link to="/quiz">Lancer un quiz</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI grid */}
            <div>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Kpi
                  icon={<Target className="size-6" />}
                  label="Parties enregistrées"
                  value={totalAttempts.toString()}
                  color="bg-primary-soft text-primary"
                />
                <Kpi
                  icon={<TrendingUp className="size-6" />}
                  label="Score moyen"
                  value={`${avgScore}%`}
                  color="bg-accent-soft text-accent"
                />
                <Kpi
                  icon={<Trophy className="size-6" />}
                  label="Tout bon"
                  value={perfect.toString()}
                  color="bg-success-soft text-success"
                />
                <Kpi
                  icon={<Flame className="size-6" />}
                  label="Meilleure série"
                  value={`${profile.longest_streak}j`}
                  color="bg-warning-soft text-warning"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 max-w-3xl">
                Basé sur les tentatives enregistrées (ex. quiz thème, question du jour). Marathon,
                duels et mode niveaux ne créent pas ces lignes — donc tu ne les vois pas ici, même si
                ton XP a bougé ailleurs.
              </p>
            </div>

            {/* Per-theme breakdown */}
            <div className="bg-card rounded-3xl border-2 border-border p-6 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <h2 className="text-xl font-extrabold mb-2">Perf par thème</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Uniquement les parties où un thème est relié (souvent quiz thème + daily).
              </p>
              <div className="space-y-4">
                {THEME_KEYS.map((k) => {
                  const t = byTheme[k];
                  const pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                  return (
                    <div
                      key={k}
                      className="rounded-xl px-2 py-1.5 -mx-2 transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-muted/50 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-base">
                          {THEMES[k].emoji} {THEMES[k].label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t.count} quiz · {pct}%
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Last 10 attempts mini chart */}
            <div className="bg-card rounded-3xl border-2 border-border p-6 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <h2 className="text-xl font-extrabold mb-4">
                Tes {last10.length} dernières parties
              </h2>
              <div className="flex items-end justify-between gap-2 h-40">
                {last10.map((a, i) => {
                  const h = Math.max(8, (a.score / maxScore) * 100);
                  const good = a.score >= 7;
                  return (
                    <div key={a.id} className="flex flex-col items-center flex-1 group">
                      <div className="text-xs font-bold mb-1">{a.score}</div>
                      <div
                        className={`w-full rounded-t-lg transition-all ${good ? "bg-success" : "bg-warning"}`}
                        style={{ height: `${h}%` }}
                        title={`${a.score}/${a.total_questions} le ${new Date(a.completed_at).toLocaleDateString("fr-FR")}`}
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">#{i + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total XP */}
            <div className="bg-gradient-to-br from-primary-soft to-accent-soft rounded-3xl border-2 border-primary/20 p-6 text-center shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_18px_36px_-14px_rgba(79,70,229,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100">
              <p className="text-base text-muted-foreground mb-1">XP total (tout confondu)</p>
              <p className="text-5xl font-extrabold text-primary">{profile.total_xp} XP</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="group bg-card rounded-2xl border-2 border-border p-4 text-center transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(15,23,42,0.65)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div
        className={`inline-flex items-center justify-center size-12 rounded-xl mb-2 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 motion-reduce:group-hover:scale-100 ${color}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
