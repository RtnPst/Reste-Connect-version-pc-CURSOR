import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Sparkles, Star, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { getBadgeUiCopy, badgeUnlockHintOrDefault } from "@/lib/badge-ui";

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

export const Route = createFileRoute("/parcours")({
  head: () => ({
    meta: [
      { title: "Ton parcours — Tu captes ?" },
      { name: "description", content: "Badges, stats et progression — ton game « Tu captes ? »." },
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
        .select("score, total_questions")
        .eq("user_id", user.id)
        .eq("mode", "theme");
      const total = attempts?.length ?? 0;
      const avg =
        total > 0
          ? attempts!.reduce((s, a) => s + (a.score / a.total_questions) * 100, 0) / total
          : 0;
      setStats({ totalAttempts: total, avgScore: Math.round(avg) });
    })();
  }, [user]);

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>Chargement…</p>
        </main>
      </div>
    );
  }

  const level = Math.floor(profile.total_xp / 100) + 1;
  const xpInLevel = profile.total_xp % 100;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-4xl flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
          Salut {profile.display_name ?? "toi"} !
        </h1>
        <p className="text-lg text-muted-foreground mb-8">Voilà où t'en es.</p>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-8">
          <StatCard
            icon={<Star className="size-7" />}
            label="Niveau"
            value={level.toString()}
            accent="text-primary bg-primary-soft"
          />
          <StatCard
            icon={<Sparkles className="size-7" />}
            label="Points (XP)"
            value={profile.total_xp.toString()}
            accent="text-accent bg-accent-soft"
          />
          <StatCard
            icon={<Flame className="size-7" />}
            label="Série"
            value={`${profile.current_streak} j`}
            accent="text-warning bg-warning-soft"
          />
          <StatCard
            icon={<Trophy className="size-7" />}
            label="Quiz thème"
            value={stats.totalAttempts.toString()}
            accent="text-success bg-success-soft"
          />
        </div>
        <p className="text-xs text-muted-foreground -mt-4 mb-8 max-w-2xl">
          Ce chiffre compte tes quiz <strong>par thème</strong> (les 4 pistes). Marathon, duels et
          mode niveaux ne s’ajoutent pas ici — ton XP et ta série, eux, suivent quand même ailleurs.
        </p>

        {/* Level progress */}
        <div className="bg-card rounded-3xl border-2 border-border p-6 mb-8">
          <div className="flex justify-between mb-2">
            <span className="font-bold">Niveau {level}</span>
            <span className="text-muted-foreground">{xpInLevel} / 100 XP</span>
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${xpInLevel}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Moyenne sur tes quiz thème : <strong>{stats.avgScore}%</strong> · Record de série :{" "}
            <strong>{profile.longest_streak} jours</strong>
          </p>
        </div>

        {/* Badges */}
        <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-extrabold mb-4">Tes badges ({badges.length})</h2>
          {allBadges.length === 0 ? (
            <p className="text-muted-foreground">
              Le catalogue charge ou est vide. Réessaie dans un instant.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {allBadges.map((b) => {
                const isEarned = earnedBadgeIds.includes(b.id);
                const ui = getBadgeUiCopy(b.code);
                const displayName = ui?.name ?? b.name;
                const earnedDescription = ui?.description ?? b.description;
                const lockedHint = badgeUnlockHintOrDefault(b.code);
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
                      isEarned
                        ? "bg-accent-soft border-accent/20"
                        : "bg-muted/40 border-border opacity-70"
                    }`}
                  >
                    <span className="text-4xl flex-shrink-0" aria-hidden>
                      {b.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold">
                        {displayName}{" "}
                        {!isEarned && <span className="text-xs font-semibold">(pas encore)</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isEarned ? earnedDescription : lockedHint}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="xl" variant="accent">
            <Link to="/quiz">Faire un quiz</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link to="/reglages">Réglages d'accessibilité</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border p-4 flex items-center gap-3">
      <div className={`size-12 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground font-semibold">{label}</p>
        <p className="text-2xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}
