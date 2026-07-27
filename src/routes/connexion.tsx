import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Tu captes ?" },
      {
        name: "description",
        content: "Connecte-toi pour garder tes traces et reprises sur le fil culturel.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const fallbackPseudoFromEmail = (value: string) => value.split("@")[0]?.trim() || "toi";

  const getPseudoFromProfile = async (emailValue: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return fallbackPseudoFromEmail(emailValue);

    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    const name = (data as { display_name?: string | null } | null)?.display_name?.trim();
    return name || fallbackPseudoFromEmail(emailValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const pseudo = (displayName || fallbackPseudoFromEmail(email)).trim();
        await signUp(email, password, pseudo);
        toast.success(`Bienvenue sur le fil, ${pseudo}`, {
          description: "Si la confirmation e-mail est active, vérifie ta boîte — puis reconnecte-toi.",
        });
        navigate({ to: "/" });
      } else {
        await signIn(email, password);
        const pseudo = await getPseudoFromProfile(email);
        toast.success(`Bon retour sur le fil, ${pseudo}`);
        navigate({ to: "/" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      if (message.toLowerCase().includes("invalid login")) {
        toast.error("Email ou mot de passe incorrect.");
      } else if (
        message.toLowerCase().includes("already registered") ||
        message.toLowerCase().includes("user already")
      ) {
        toast.error("Un compte existe déjà avec cet email. Essaie de te connecter.");
      } else if (message.toLowerCase().includes("password")) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion Google indisponible.";
      toast.error(message);
    }
  };

  return (
    <JourneyPage>
      <AppHeader />
      <main className="flex min-w-0 w-full max-w-full flex-1 items-center justify-center overflow-x-clip px-4 py-10">
        <div className="w-full min-w-0 max-w-md">
          <div className="journey-panel bg-card/95 p-6 sm:p-8">
            <p className="text-center text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">
              Sur le fil
            </p>
            <h1 className="mt-2 text-center text-2xl font-extrabold sm:text-3xl">
              {mode === "signin" ? "Reprendre ton fil" : "Garder ton fil"}
            </h1>
            <p className="mb-6 mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              {mode === "signin"
                ? "Tes captures et reprises t’attendent — sans pression."
                : "Un compte pour retrouver tes traces et le fil du jour."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-semibold">
                    Comment tu veux qu’on t’appelle ?
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex : Marie, Papi Jean…"
                    className="h-14 text-lg"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.fr"
                  className="h-14 text-lg"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                  className="h-14 text-lg"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              <Button
                type="submit"
                size="xl"
                variant="accent"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Un instant…" : mode === "signin" ? "Me connecter" : "Créer mon compte"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button onClick={handleGoogle} size="lg" variant="outline" className="w-full">
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </Button>

            <div className="mt-6 text-center text-base">
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Pas encore de compte ? Créer un compte
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Déjà un compte ? Me connecter
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/play"
              className="text-base text-muted-foreground underline-offset-4 hover:underline"
            >
              Ou entrer sur le fil sans compte →
            </Link>
          </div>
        </div>
      </main>
    </JourneyPage>
  );
}
