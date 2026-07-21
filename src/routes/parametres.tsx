import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { playCorrect, playFanfare, startMusic, stopMusic } from "@/lib/sfx";
import {
  disableReminder,
  enableReminder,
  isNotificationsSupported,
  isReminderEnabled,
} from "@/lib/reminders";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Tu captes ?" },
      {
        name: "description",
        content: "Confort, sons, notifications et compte — pour lire le fil à ton rythme.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, updatePreferences } = useAuth();
  useRequireAuth();
  const navigate = useNavigate();
  const [reminder, setReminder] = useState(false);
  const notifSupported = isNotificationsSupported();

  useEffect(() => {
    setReminder(isReminderEnabled());
  }, []);

  useEffect(() => () => stopMusic(), []);

  if (!profile) {
    return (
      <JourneyPage>
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>On prépare tes paramètres…</p>
        </main>
      </JourneyPage>
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

  return (
    <JourneyPage>
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-lg flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-5">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">Confort</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Paramètres</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ajuste le rythme du fil : texte, sons, rappels, compte.
          </p>
        </header>

        <div className="space-y-5 sm:space-y-6">
          <section className="journey-panel p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold">Préférences</h2>
            <div className="space-y-4">
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

              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <Label htmlFor="sfx" className="text-base sm:text-lg font-extrabold cursor-pointer">
                      Effets sonores
                    </Label>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Sons de capture et de fin de passage.
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
                      <Volume2 className="size-4" /> Tu as capté
                    </Button>
                    <Button onClick={() => playFanfare(true)} variant="outline" size="sm">
                      <Volume2 className="size-4" /> Fin de fil
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="music" className="text-base sm:text-lg font-extrabold cursor-pointer">
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

          <div className="grid gap-5">
            <section className="journey-panel p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-extrabold">Accessibilité</h2>
              <div className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="contrast" className="text-base sm:text-lg font-extrabold cursor-pointer">
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

            {notifSupported && (
              <section className="journey-panel p-5 sm:p-6">
                <h2 className="mb-4 text-lg font-extrabold">Notifications</h2>
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
                        Petit ping <strong>navigateur</strong> (local), pas une push serveur.
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

          <section className="journey-panel p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold">Compte</h2>
            <div className="grid gap-3">
              <Button asChild variant="outline" size="lg" className="w-full justify-start">
                <Link to="/parcours">Tes traces sur le fil</Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" size="lg" className="w-full">
                Se déconnecter
              </Button>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
                Informations légales
              </h3>
              <div className="mt-3 flex flex-col gap-2 text-sm sm:text-base">
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/privacy">
                  Politique de confidentialité
                </Link>
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/terms">
                  Conditions d’utilisation
                </Link>
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/delete-account">
                  Supprimer mon compte
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </JourneyPage>
  );
}
