import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { stopMusic } from "@/lib/sfx";
import { toast } from "sonner";

export const Route = createFileRoute("/reglages")({
  head: () => ({
    meta: [
      { title: "Profil — Tu captes ?" },
      {
        name: "description",
        content: "Ton profil : avatar, pseudo et compte.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isEmailConfirmed, resendConfirmationEmail, updatePreferences } = useAuth();
  useRequireAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarSectionRef = useRef<HTMLElement | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? "");
  }, [profile]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((value) => (value > 1 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => () => stopMusic(), []);

  if (!profile) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p className="text-muted-foreground">On prépare ton profil…</p>
        </main>
      </div>
    );
  }

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

  const handleResendConfirmation = async () => {
    if (resendBusy || resendCooldown > 0) return;
    setResendBusy(true);
    try {
      await resendConfirmationEmail();
      setResendCooldown(60);
      toast.success("Email de confirmation renvoyé");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de renvoyer l’email pour le moment";
      toast.error(message);
    } finally {
      setResendBusy(false);
    }
  };

  const streak = profile.current_streak ?? 0;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-lg flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-primary-soft text-4xl sm:size-[4.25rem]">
            {profile.avatar}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Profil</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
              {displayName?.trim() || "Sans pseudo"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {streak > 0 ? `Série : ${streak} jour${streak > 1 ? "s" : ""}` : "Ton identité sur l’app"}
            </p>
          </div>
        </header>

        {!isEmailConfirmed && (
          <section className="mb-5 rounded-2xl border border-primary/25 bg-primary/8 p-4">
            <p className="text-sm font-semibold">Confirme ton email</p>
            <p className="mt-1 text-xs text-muted-foreground">Pour sécuriser le compte — tu peux jouer en attendant.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={handleResendConfirmation}
              disabled={resendBusy || resendCooldown > 0}
            >
              {resendBusy
                ? "Envoi…"
                : resendCooldown > 0
                  ? `Renvoyer (${resendCooldown}s)`
                  : "Renvoyer l’email"}
            </Button>
          </section>
        )}

        <section
          ref={avatarSectionRef}
          className="mb-5 rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5"
        >
          <h2 className="text-sm font-extrabold">Identité</h2>
          <p className="mt-1 text-sm text-muted-foreground">Avatar</p>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {AVATAR_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => void updatePreferences({ avatar: a })}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition-colors ${
                  profile.avatar === a
                    ? "border-primary bg-primary-soft"
                    : "border-border/70 bg-background/40 hover:border-primary/40"
                }`}
                aria-label={`Choisir l'avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Pseudo</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12 flex-1 text-base"
              placeholder="Ton nom ou pseudo"
            />
            <Button onClick={saveName} disabled={saving} variant="accent" size="lg" className="shrink-0">
              Enregistrer
            </Button>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5">
          <h2 className="text-sm font-extrabold">Raccourcis</h2>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline" size="lg" className="w-full justify-start">
              <Link to="/parcours">Voir mon parcours</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full justify-start">
              <Link to="/parametres">Paramètres (son, accessibilité…)</Link>
            </Button>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/marathon" className="font-semibold text-primary underline-offset-4 hover:underline">
            Session marathon
          </Link>
          <span> — hors du fil principal.</span>
        </p>
      </main>
    </div>
  );
}
