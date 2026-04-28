import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Reste connecté !" },
      {
        name: "description",
        content: "Connectez-vous ou créez un compte pour sauvegarder vos quiz.",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, displayName || email.split("@")[0]);
        toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
        // After signup auto-confirm may be on; try navigating home
        navigate({ to: "/" });
      } else {
        await signIn(email, password);
        toast.success("Bon retour parmi nous !");
        navigate({ to: "/" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      // Friendly French messages for common errors
      if (message.toLowerCase().includes("invalid login")) {
        toast.error("Email ou mot de passe incorrect.");
      } else if (
        message.toLowerCase().includes("already registered") ||
        message.toLowerCase().includes("user already")
      ) {
        toast.error("Un compte existe déjà avec cet email. Essayez de vous connecter.");
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
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-[var(--shadow-card)]">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-center">
              {mode === "signin" ? "Bon retour !" : "Créer mon compte"}
            </h1>
            <p className="text-center text-muted-foreground mb-6">
              {mode === "signin"
                ? "Connectez-vous pour retrouver votre progression."
                : "Sauvegardez vos badges et votre série de jeu."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-semibold">
                    Comment souhaitez-vous être appelé(e) ?
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
                  placeholder="vous@exemple.fr"
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
              <div className="h-px bg-border flex-1" />
              <span className="text-sm text-muted-foreground">ou</span>
              <div className="h-px bg-border flex-1" />
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
                  onClick={() => setMode("signup")}
                  className="text-primary font-semibold underline-offset-4 hover:underline"
                >
                  Pas encore de compte ? Créer un compte
                </button>
              ) : (
                <button
                  onClick={() => setMode("signin")}
                  className="text-primary font-semibold underline-offset-4 hover:underline"
                >
                  Déjà un compte ? Me connecter
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/quiz"
              className="text-base text-muted-foreground underline-offset-4 hover:underline"
            >
              Ou jouer en invité, sans compte →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
