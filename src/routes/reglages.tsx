import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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
      { title: "Réglages — Reste connecté !" },
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
  const { user, loading } = useRequireAuth();
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
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p>Chargement…</p>
        </main>
      </div>
    );
  }

  const update = async (prefs: Parameters<typeof updatePreferences>[0]) => {
    try {
      await updatePreferences(prefs);
      toast.success("Préférences enregistrées");
    } catch {
      toast.error("Impossible d'enregistrer");
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
    await update({ music_enabled: v });
    if (v) startMusic();
    else stopMusic();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Réglages</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Adaptez l'application à vos préférences.
        </p>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <h2 className="text-xl font-extrabold mb-4">Mon avatar</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="size-16 rounded-full bg-primary-soft flex items-center justify-center text-4xl border-2 border-primary">
                {profile.avatar}
              </div>
              <p className="text-base text-muted-foreground">
                Choisissez un avatar pour vous représenter.
              </p>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {AVATAR_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => update({ avatar: a })}
                  className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all ${
                    profile.avatar === a
                      ? "border-primary bg-primary-soft scale-110"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                  aria-label={`Choisir l'avatar ${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <h2 className="text-xl font-extrabold mb-4">Mon pseudo</h2>
            <p className="text-base text-muted-foreground mb-3">
              C'est ce nom qui s'affiche dans les duels.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-14 text-lg flex-1"
                placeholder="Votre nom ou pseudo"
              />
              <Button onClick={saveName} disabled={saving} variant="accent" size="lg">
                Enregistrer
              </Button>
            </div>
          </div>

          {/* Font size */}
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <h2 className="text-xl font-extrabold mb-4">Taille du texte</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["normal", "large", "xlarge"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update({ font_size: size })}
                  className={`rounded-2xl p-4 border-2 transition-all ${profile.font_size === size ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"}`}
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
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <Label htmlFor="sfx" className="text-xl font-extrabold cursor-pointer">
                  Effets sonores
                </Label>
                <p className="text-base text-muted-foreground mt-1">
                  Petits sons pour les bonnes/mauvaises réponses et la fin de quiz.
                </p>
              </div>
              <Switch
                id="sfx"
                checked={profile.sfx_enabled}
                onCheckedChange={(v) => update({ sfx_enabled: v })}
                className="scale-150"
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
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="music" className="text-xl font-extrabold cursor-pointer">
                  Musique d'ambiance
                </Label>
                <p className="text-base text-muted-foreground mt-1">
                  Une nappe douce et discrète pendant les quiz.
                </p>
              </div>
              <Switch
                id="music"
                checked={profile.music_enabled}
                onCheckedChange={toggleMusic}
                className="scale-150"
              />
            </div>
          </div>

          {/* Audio (lecture vocale) */}
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="audio" className="text-xl font-extrabold cursor-pointer">
                  Lecture vocale
                </Label>
                <p className="text-base text-muted-foreground mt-1">
                  Active le bouton pour écouter les questions et explications.
                </p>
              </div>
              <Switch
                id="audio"
                checked={profile.audio_enabled}
                onCheckedChange={(v) => update({ audio_enabled: v })}
                className="scale-150"
              />
            </div>
          </div>

          {/* Contrast */}
          <div className="bg-card rounded-3xl border-2 border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="contrast" className="text-xl font-extrabold cursor-pointer">
                  Contraste élevé
                </Label>
                <p className="text-base text-muted-foreground mt-1">
                  Renforce les contrastes pour mieux voir les textes.
                </p>
              </div>
              <Switch
                id="contrast"
                checked={profile.high_contrast}
                onCheckedChange={(v) => update({ high_contrast: v })}
                className="scale-150"
              />
            </div>
          </div>

          {/* Reminder */}
          {notifSupported && (
            <div className="bg-card rounded-3xl border-2 border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label
                    htmlFor="reminder"
                    className="text-xl font-extrabold cursor-pointer flex items-center gap-2"
                  >
                    <Bell className="size-5" /> Rappel quotidien
                  </Label>
                  <p className="text-base text-muted-foreground mt-1">
                    Une notification pour vous rappeler la question du jour.
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
                      } else toast.error("Notifications refusées par votre navigateur");
                    } else {
                      disableReminder();
                      setReminder(false);
                      toast.success("Rappel désactivé");
                    }
                  }}
                  className="scale-150"
                />
              </div>
            </div>
          )}

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/parcours">Retour au parcours</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
