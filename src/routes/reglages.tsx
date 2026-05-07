import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { stopMusic } from "@/lib/sfx";

export const Route = createFileRoute("/reglages")({
  head: () => ({
    meta: [
      { title: "Profil — Tu captes ?" },
      {
        name: "description",
        content: "Ton profil : avatar, pseudo et progression personnelle.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, updatePreferences } = useAuth();
  useRequireAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? "");
  }, [profile]);

  // Stop ambient music when leaving settings preview
  useEffect(() => () => stopMusic(), []);

  if (!profile) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>On prépare tes réglages…</p>
        </main>
      </div>
    );
  }

  const update = async (prefs: Parameters<typeof updatePreferences>[0]) => {
    try {
      await updatePreferences(prefs);
      toast.success("Préférences enregistrées");
      return true;
    } catch (err) {
      console.error("Erreur enregistrement préférences:", err);
      toast.error("Impossible d'enregistrer");
      return false;
    }
  };

  const saveName = async () => {
    setSaving(true);
    try {
      await updatePreferences({ display_name: displayName });
      toast.success("Nom mis à jour");
    } catch {
      toast.error("Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  const jumpToAvatar = () =>
    avatarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const currentRank = Math.floor(profile.total_xp / 100) + 1;
  const streak = profile.current_streak ?? 0;
  const longestStreak = profile.longest_streak ?? 0;
  const streakMessage =
    streak > 0 && streak + 1 >= longestStreak
      ? "Plus qu’un jour pour battre ton record."
      : "Continue comme ça 🔥";

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-clip px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(15,23,42,0.75)] sm:mb-6 sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={jumpToAvatar}
                aria-label="Aller à la sélection d'avatar"
                className="size-16 rounded-full border-2 border-primary bg-primary-soft text-4xl flex items-center justify-center transition-[transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:rotate-6 sm:size-20 motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0"
              >
                {profile.avatar}
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Profil</h1>
                <p className="text-base font-semibold text-foreground">
                  {displayName?.trim() || "Profil sans pseudo"}
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Ton identité et ta progression personnelle.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft/70 px-2.5 py-1 text-xs sm:text-sm font-semibold text-foreground">
                    <span aria-hidden>🔥</span> {streak} jour{streak > 1 ? "s" : ""} de suite
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{streakMessage}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <h2 className="text-xl font-extrabold mb-2">Ta progression</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Parcours reste l’espace principal pour le détail complet de ton évolution.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs sm:text-sm font-semibold">
                Rang {currentRank}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs sm:text-sm font-semibold">
                {profile.total_xp} XP
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning-soft/60 px-3 py-1.5 text-xs sm:text-sm font-semibold">
                <Flame className="size-3.5" /> {longestStreak} jours record
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/parcours">Ouvrir Parcours</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/parametres">Ouvrir paramètres</Link>
              </Button>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section
              ref={avatarSectionRef}
              className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <h2 className="text-xl font-extrabold mb-4">Mon avatar</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Choisis un emoji qui te ressemble.
              </p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => update({ avatar: a })}
                    className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      profile.avatar === a
                        ? "border-primary bg-primary-soft scale-110"
                        : "border-border bg-card hover:border-primary/50 hover:scale-110 active:scale-95 motion-reduce:hover:scale-100"
                    }`}
                    aria-label={`Choisir l'avatar ${a}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <h2 className="text-xl font-extrabold mb-4">Mon pseudo</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-3">
                Ce nom s’affiche dans les duels et sur ton profil.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12 sm:h-14 text-base sm:text-lg flex-1"
                  placeholder="Ton nom ou pseudo"
                />
                <Button onClick={saveName} disabled={saving} variant="accent" size="lg">
                  Enregistrer
                </Button>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}
