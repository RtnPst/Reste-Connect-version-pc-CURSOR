import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FilTracesSection } from "@/components/FilTracesSection";
import { JourneyPage } from "@/components/JourneyPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { getBadgeUiCopy, badgeUnlockHintOrDefault } from "@/lib/badge-ui";
import {
  fetchRecentCapturedConcepts,
  type RecentCapturedConcept,
} from "@/lib/recent-captured-concepts";
import { type RecentPassage } from "@/lib/session-passage";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";

type EarnedBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
};
type BadgeCatalog = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
};
type Stats = { totalAttempts: number; avgScore: number };
type ThemeStat = { key: ThemeKey; pct: number; count: number };
type RecentAttempt = RecentPassage;
type GameStats = { totalAttempts: number; avgScore: number; perfect: number };

export const Route = createFileRoute("/parcours")({
  head: () => ({
    meta: [
      { title: "Traces sur ton fil — Tu captes ?" },
      {
        name: "description",
        content: "Les traces de ton fil culturel — passages récents et concepts captés.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuth();
  const { user, loading } = useRequireAuth();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeCatalog[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ totalAttempts: 0, avgScore: 0 });
  const [gameStats, setGameStats] = useState<GameStats>({ totalAttempts: 0, avgScore: 0, perfect: 0 });
  const [themeStats, setThemeStats] = useState<ThemeStat[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [recentCaptured, setRecentCaptured] = useState<RecentCapturedConcept[]>([]);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ub } = await supabase
        .from("user_badges")
        .select("earned_at, badges(id, name, description, icon)")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      const earned: EarnedBadge[] = (ub ?? [])
        .map((row) => {
          const b = (
            row as {
              badges: { id: string; name: string; description: string; icon: string } | null;
            }
          ).badges;
          return b
            ? {
                id: b.id,
                name: b.name,
                description: b.description,
                icon: b.icon,
                earned_at: (row as { earned_at: string }).earned_at,
              }
            : null;
        })
        .filter((x): x is EarnedBadge => x !== null);
      setBadges(earned);
      setEarnedBadgeIds(earned.map((b) => b.id));

      const { data: catalog } = await supabase
        .from("badges")
        .select("id, code, name, description, icon")
        .order("created_at", { ascending: true });
      setAllBadges((catalog as BadgeCatalog[]) ?? []);

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions, theme")
        .eq("user_id", user.id)
        .eq("mode", "theme");
      const total = attempts?.length ?? 0;
      const avg =
        total > 0
          ? attempts!.reduce((s, a) => s + (a.score / a.total_questions) * 100, 0) / total
          : 0;
      setStats({ totalAttempts: total, avgScore: Math.round(avg) });

      const byTheme: Record<ThemeKey, { correct: number; total: number; count: number }> = {
        vocabulaire: { correct: 0, total: 0, count: 0 },
        reseaux_sociaux: { correct: 0, total: 0, count: 0 },
        gaming: { correct: 0, total: 0, count: 0 },
        trends_pop_culture: { correct: 0, total: 0, count: 0 },
        relations_lifestyle: { correct: 0, total: 0, count: 0 },
        culture_pop: { correct: 0, total: 0, count: 0 },
        tech: { correct: 0, total: 0, count: 0 },
      };
      for (const a of attempts ?? []) {
        const theme = a.theme as ThemeKey | null;
        if (!theme || !byTheme[theme]) continue;
        byTheme[theme].count += 1;
        byTheme[theme].correct += a.score;
        byTheme[theme].total += a.total_questions;
      }
      const compactThemeStats = THEME_KEYS.map((key) => {
        const t = byTheme[key];
        const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
        return { key, pct, count: t.count };
      }).filter((item) => item.count > 0);
      setThemeStats(compactThemeStats);

      const { data: allAttempts } = await supabase
        .from("quiz_attempts")
        .select("id, mode, score, total_questions, completed_at, theme")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      const all = allAttempts ?? [];
      const totalAll = all.length;
      const totalCorrect = all.reduce((sum, item) => sum + item.score, 0);
      const totalQuestions = all.reduce((sum, item) => sum + item.total_questions, 0);
      const avgAll = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const perfect = all.filter((item) => item.score === item.total_questions).length;
      setGameStats({ totalAttempts: totalAll, avgScore: avgAll, perfect });
      setRecentAttempts(
        all.slice(0, 6).map((item) => ({
          id: item.id,
          mode: item.mode,
          theme: item.theme,
          score: item.score,
          total_questions: item.total_questions,
          completed_at: item.completed_at,
        })),
      );

      const captured = await fetchRecentCapturedConcepts(user.id, 4);
      setRecentCaptured(captured);
    })();
  }, [user]);

  if (loading || !user || !profile) {
    return (
      <JourneyPage>
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>On assemble ton fil culturel…</p>
        </main>
      </JourneyPage>
    );
  }

  const level = Math.floor(profile.total_xp / 100) + 1;
  const previewBadgeCount = 3;
  const visibleBadges = showAllBadges ? allBadges : allBadges.slice(0, previewBadgeCount);

  return (
    <JourneyPage>
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-lg flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 animate-fade-in">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">Mémoire du fil</p>
          {recentCaptured[0] ? (
            <div className="mt-3 rounded-2xl border border-primary/25 bg-primary-soft/40 px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-[11px] font-medium tracking-[0.12em] text-primary/80">Tu as capté</p>
              <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
                {recentCaptured[0].label}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile.display_name
                  ? `${profile.display_name} — ce mot reste sur ton fil.`
                  : "Ce mot reste sur ton fil."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  void (async () => {
                    const { shareCapturedConcept } = await import("@/lib/share");
                    const { toast } = await import("sonner");
                    const r = await shareCapturedConcept(recentCaptured[0].label);
                    if (r === "copied") toast.success("Copié dans le presse-papiers");
                  })();
                }}
              >
                Partager « Tu as capté »
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
                {profile.display_name ? `${profile.display_name} — ton fil` : "Traces sur ton fil"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Ce que tu as parcouru et capté — une ligne de lecture, pas un tableau.
              </p>
            </>
          )}
        </header>

        <section className="journey-panel mb-6 p-4 sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.1em] text-primary/75">Position sur le fil</p>
          <p className="mt-2 text-base font-extrabold leading-snug">
            {profile.current_streak > 0 ? (
              <>
                Série {profile.current_streak} jour{profile.current_streak > 1 ? "s" : ""}
                {profile.longest_streak > 0 ? (
                  <span className="font-medium text-muted-foreground"> · record {profile.longest_streak} j</span>
                ) : null}
              </>
            ) : (
              "Le fil commence à la prochaine ouverture"
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.current_streak > 0
              ? "Le chemin et tes captures s’ajoutent ici — sans classement."
              : "Pas de pression : un passage suffit pour laisser une première trace."}
          </p>
          <div className="journey-filament mt-3" aria-hidden>
            <span
              style={{
                width: `${Math.min(100, recentAttempts.length * 12 + recentCaptured.length * 8)}%`,
              }}
            />
          </div>
        </section>

        <FilTracesSection passages={recentAttempts} concepts={recentCaptured} />

        <div className="journey-panel mb-6 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold sm:text-2xl">Moments sur le fil ({badges.length})</h2>
            {allBadges.length > previewBadgeCount && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllBadges((v) => !v)}>
                {showAllBadges ? "Réduire" : "Voir tous"}
              </Button>
            )}
          </div>
          {allBadges.length === 0 ? (
            <p className="text-muted-foreground">
              Le catalogue charge ou est vide. Réessaie dans un instant.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {visibleBadges.map((b) => {
                const isEarned = earnedBadgeIds.includes(b.id);
                const ui = getBadgeUiCopy(b.code);
                const displayName = ui?.name ?? b.name;
                const earnedDescription = ui?.description ?? b.description;
                const lockedHint = badgeUnlockHintOrDefault(b.code);
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 ${
                      isEarned
                        ? "bg-accent-soft border-accent/20"
                        : "bg-muted/40 border-border opacity-70"
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0" aria-hidden>
                      {b.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-[15px] leading-tight">
                        {displayName}{" "}
                        {!isEarned && <span className="text-xs font-medium text-muted-foreground">· bientôt</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isEarned ? earnedDescription : lockedHint}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {themeStats.length > 0 ? (
          <details className="mb-6 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-foreground/90">Angles parcourus</summary>
            <div className="mt-3 space-y-2.5">
              {themeStats.slice(0, 4).map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {THEMES[item.key].emoji} {THEMES[item.key].label}
                    </span>
                    <span className="text-muted-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full bg-primary/70" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <details className="mb-6 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-foreground/90">Chiffres du fil</summary>
          <p className="mt-3 text-muted-foreground">
            Niveau {level} · {gameStats.totalAttempts} passage{gameStats.totalAttempts > 1 ? "s" : ""} ·{" "}
            {profile.total_xp} XP cumulés
          </p>
        </details>

        <div className="flex flex-col gap-2">
          <Button asChild size="lg" variant="accent" className="w-full">
            <Link to="/play">Reprendre le fil</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to="/niveaux">Le chemin</Link>
          </Button>
        </div>
      </main>
    </JourneyPage>
  );
}

