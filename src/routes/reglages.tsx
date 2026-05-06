import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Bell, Swords, Target, Trophy, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { playCorrect, playFanfare, startMusic, stopMusic } from "@/lib/sfx";
import {
  disableReminder,
  enableReminder,
  isNotificationsSupported,
  isReminderEnabled,
} from "@/lib/reminders";

export const Route = createFileRoute("/reglages")({
  head: () => ({
    meta: [
      { title: "Réglages — Tu captes ?" },
      {
        name: "description",
        content: "Réglages d'accessibilité : avatar, pseudo, sons, taille du texte, contraste.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, updatePreferences } = useAuth();
  useRequireAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [reminder, setReminder] = useState(false);
  const notifSupported = isNotificationsSupported();

  useEffect(() => {
    setReminder(isReminderEnabled());
  }, []);

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
          <p>Chargement…</p>
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

  const toggleMusic = async (v: boolean) => {
    const saved = await update({ music_enabled: v });
    if (!saved) return;
    if (v) startMusic();
    else stopMusic();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full border-2 border-primary bg-primary-soft text-4xl flex items-center justify-center transition-[transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:rotate-6 sm:size-20 motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0">
                {profile.avatar}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Réglages</h1>
                <p className="text-base font-semibold text-foreground">
                  {displayName?.trim() || "Profil sans pseudo"}
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Gère ton profil, tes stats et tes préférences.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft/70 px-2.5 py-1 text-xs sm:text-sm font-semibold text-foreground">
                    <span aria-hidden>🔥</span> {streak} jour{streak > 1 ? "s" : ""} de suite
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{streakMessage}</span>
                </div>
              </div>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="self-start sm:self-auto transition-[transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] active:scale-[0.98] motion-reduce:hover:scale-100"
            >
              <Link to="/statistiques">
                <BarChart3 className="size-4" />
                Voir toutes mes stats
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {/* Stats summary */}
          <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <h2 className="text-xl font-extrabold mb-4">Mes stats</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile
                icon={<Trophy className="size-5" />}
                label="XP / Rang"
                value={`${profile.total_xp} XP · Rang ${currentRank}`}
              />
              <StatTile
                icon={<Swords className="size-5" />}
                label="Duels gagnés"
                value="—"
                hint="Le détail duel arrive ici plus tard — en attendant, va sur Duel."
              />
              <StatTile
                icon={<Target className="size-5" />}
                label="Taux de réussite"
                value="—"
                hint="Ouvre Statistiques pour le taux par thème (quiz enregistrés)."
              />
              <StatTile
                icon={<BarChart3 className="size-5" />}
                label="Parties jouées"
                value="—"
                hint="Ouvre Statistiques pour l’historique des parties enregistrées."
              />
              <StatTile
                icon={<Target className="size-5" />}
                label="Record de série"
                value={`${longestStreak} jour${longestStreak > 1 ? "s" : ""}`}
              />
            </div>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              L’essentiel du détail est sur la page Statistiques ; le reste arrive petit à petit.
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
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

          {/* Preferences */}
          <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <h2 className="text-xl font-extrabold mb-4">Préférences</h2>
            <div className="space-y-4">
              {/* Font size */}
              <div>
                <Label className="text-base sm:text-lg font-extrabold">Taille du texte</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(["normal", "large", "xlarge"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => update({ font_size: size })}
                      className={`rounded-2xl p-4 border-2 transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${profile.font_size === size ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/50 hover:scale-[1.03] active:scale-[0.98] motion-reduce:hover:scale-100"}`}
                    >
                      <p
                        className={`font-bold ${size === "normal" ? "text-base" : size === "large" ? "text-lg" : "text-xl"}`}
                      >
                        {size === "normal" ? "Normal" : size === "large" ? "Grand" : "Très grand"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Aperçu : Aa</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound effects */}
              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <Label
                      htmlFor="sfx"
                      className="text-base sm:text-lg font-extrabold cursor-pointer"
                    >
                      Effets sonores
                    </Label>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Sons de validation et de fin de quiz.
                    </p>
                  </div>
                  <Switch
                    id="sfx"
                    checked={profile.sfx_enabled}
                    onCheckedChange={(v) => update({ sfx_enabled: v })}
                    className="scale-125 sm:scale-150"
                  />
                </div>
                {profile.sfx_enabled && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button onClick={() => playCorrect(true)} variant="outline" size="sm">
                      <Volume2 className="size-4" /> Bonne réponse
                    </Button>
                    <Button onClick={() => playFanfare(true)} variant="outline" size="sm">
                      <Volume2 className="size-4" /> Fanfare
                    </Button>
                  </div>
                )}
              </div>

              {/* Ambient music */}
              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label
                      htmlFor="music"
                      className="text-base sm:text-lg font-extrabold cursor-pointer"
                    >
                      Musique d'ambiance
                    </Label>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Ambiance douce pour accompagner les sessions.
                    </p>
                  </div>
                  <Switch
                    id="music"
                    checked={profile.music_enabled}
                    onCheckedChange={toggleMusic}
                    className="scale-125 sm:scale-150"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Accessibility */}
            <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <h2 className="text-xl font-extrabold mb-4">Accessibilité</h2>
              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label
                      htmlFor="contrast"
                      className="text-base sm:text-lg font-extrabold cursor-pointer"
                    >
                      Contraste élevé
                    </Label>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Renforce la lisibilité des textes.
                    </p>
                  </div>
                  <Switch
                    id="contrast"
                    checked={profile.high_contrast}
                    onCheckedChange={(v) => update({ high_contrast: v })}
                    className="scale-125 sm:scale-150"
                  />
                </div>
              </div>
            </section>

            {/* Reminder */}
            {notifSupported && (
              <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <h2 className="text-xl font-extrabold mb-4">Notifications</h2>
                <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label
                        htmlFor="reminder"
                        className="text-base sm:text-lg font-extrabold cursor-pointer flex items-center gap-2"
                      >
                        <Bell className="size-5" /> Rappel quotidien
                      </Label>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        Petit ping <strong>navigateur</strong> (local), pas une push serveur. Souvent
                        quand tu rouvres l’app ou l’accueil — pour te rappeler la question du jour.
                      </p>
                    </div>
                    <Switch
                      id="reminder"
                      checked={reminder}
                      onCheckedChange={async (v) => {
                        if (v) {
                          const ok = await enableReminder();
                          if (ok) {
                            setReminder(true);
                            toast.success("Rappel activé");
                          } else toast.error("Notifications refusées par le navigateur");
                        } else {
                          disableReminder();
                          setReminder(false);
                          toast.success("Rappel désactivé");
                        }
                      }}
                      className="scale-125 sm:scale-150"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          <section className="rounded-3xl border-2 border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.7)] sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <h2 className="text-xl font-extrabold mb-4">Compte</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleLogout} variant="outline" size="lg" className="w-full">
                Se déconnecter
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/parcours">Retour au parcours</Link>
              </Button>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
                Informations légales
              </h3>
              <div className="mt-3 flex flex-col gap-2 text-sm sm:text-base">
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/privacy">
                  Politique de confidentialité
                </Link>
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/terms">
                  Conditions d’utilisation
                </Link>
                <Link
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  to="/delete-account"
                >
                  Supprimer mon compte
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/70 bg-background/60 p-4 transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_24px_-12px_rgba(79,70,229,0.2)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary mb-2 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 motion-reduce:group-hover:scale-100">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base sm:text-lg font-extrabold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}
