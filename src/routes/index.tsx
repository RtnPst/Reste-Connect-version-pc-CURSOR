import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Flame,
  GraduationCap,
  Infinity as InfinityIcon,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { maybeShowDailyReminder } from "@/lib/reminders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reste connecté ! — Comprenez le langage des jeunes en s'amusant" },
      {
        name: "description",
        content:
          "Quiz éducatif pour seniors : vocabulaire, réseaux sociaux, culture pop et tech. Restez proche de vos petits-enfants !",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    maybeShowDailyReminder();
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 sm:px-6 max-w-5xl pt-10 sm:pt-16 pb-8">
          <div className="text-center space-y-5 animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-soft text-accent-foreground text-sm font-bold">
              <Sparkles className="size-4" />
              Quiz éducatif & bienveillant
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
              Restez <span className="text-primary">connecté</span>
              <br />
              avec les jeunes !
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Découvrez avec le sourire le vocabulaire, les applis et la culture qui font le
              quotidien de vos enfants et petits-enfants. Pas de chrono, pas de stress — juste
              apprendre.
            </p>

            {profile && profile.current_streak > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-soft text-warning-foreground font-bold">
                <Flame className="size-5 text-warning" />
                {profile.current_streak} jour{profile.current_streak > 1 ? "s" : ""} d'affilée !
              </div>
            )}

            {installPrompt && (
              <div className="pt-1">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={async () => {
                    const promptEvent = installPrompt as Event & {
                      prompt: () => Promise<void>;
                      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
                    };
                    await promptEvent.prompt();
                    await promptEvent.userChoice;
                    setInstallPrompt(null);
                  }}
                >
                  <Download />
                  Installer l'application
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* main actions */}
        <section className="container mx-auto px-4 sm:px-6 max-w-5xl py-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              to="/niveaux"
              icon={<Trophy className="size-10" />}
              title="Parcours par niveaux"
              description="Franchissez 30 niveaux et gagnez vos rangs : Bronze, Or, Diamant…"
              accent="bg-primary-soft text-primary"
              highlighted
            />
            <ActionCard
              to="/marathon"
              icon={<InfinityIcon className="size-10" />}
              title="Mode Marathon"
              description="Score infini : enchaînez les questions sans vous arrêter !"
              accent="bg-accent-soft text-accent"
            />
            <ActionCard
              to="/quiz"
              icon={<GraduationCap className="size-10" />}
              title="Quiz par thème"
              description="10 questions sur le thème de votre choix."
              accent="bg-warning-soft text-warning"
            />
            <ActionCard
              to="/question-du-jour"
              icon={<Calendar className="size-10" />}
              title="Question du jour"
              description="Une nouvelle question chaque matin."
              accent="bg-success-soft text-success"
            />
            <ActionCard
              to={user ? "/duel" : "/connexion"}
              icon={<Swords className="size-10" />}
              title="Mode duel"
              description="Défiez un proche et comparez vos scores !"
              accent="bg-warning-soft text-warning"
            />
            <ActionCard
              to={user ? "/parcours" : "/connexion"}
              icon={<Trophy className="size-10" />}
              title="Mes badges"
              description={
                user ? "Badges et statistiques." : "Créez un compte pour suivre vos progrès."
              }
              accent="bg-primary-soft text-primary"
            />
          </div>

          {user && (
            <div className="mt-5 text-center">
              <Button asChild variant="ghost" size="lg">
                <Link to="/statistiques">
                  <BarChart3 />
                  Voir mes statistiques détaillées
                </Link>
              </Button>
            </div>
          )}
        </section>

        {/* Reassurance / accessibility */}
        <section className="container mx-auto px-4 sm:px-6 max-w-5xl py-12">
          <div className="rounded-3xl bg-card border-2 border-border p-6 sm:p-10 shadow-[var(--shadow-soft)]">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 text-center">
              Pensé pour vous, vraiment.
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 text-base">
              <Feature emoji="🔊" title="Audio intégré">
                Une voix lit chaque question si vous le souhaitez.
              </Feature>
              <Feature emoji="🔠" title="Texte ajustable">
                Choisissez la taille du texte qui vous convient.
              </Feature>
              <Feature emoji="🌈" title="Contraste élevé">
                Une option pour mieux voir les couleurs et le texte.
              </Feature>
              <Feature emoji="📚" title="Explications claires">
                Après chaque réponse, une explication pédagogique.
              </Feature>
              <Feature emoji="⏱️" title="Sans chrono">
                Prenez le temps que vous voulez pour répondre.
              </Feature>
              <Feature emoji="🤗" title="Bienveillant">
                On apprend en se trompant. Pas de jugement, jamais.
              </Feature>
            </div>
          </div>
        </section>

        {!user && (
          <section className="container mx-auto px-4 sm:px-6 max-w-3xl pb-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Prêt(e) à essayer ?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Commencez sans inscription, ou créez un compte pour sauvegarder vos progrès.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="xl" variant="accent">
                <Link to="/quiz">Essayer un quiz tout de suite</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/connexion">Créer un compte</Link>
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t-2 border-border py-6 text-center text-sm text-muted-foreground">
        Fait avec ❤️ pour rapprocher les générations.
      </footer>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  description,
  accent,
  highlighted = false,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group block rounded-3xl border-2 p-6 transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-card)] ${
        highlighted
          ? "border-primary bg-primary-soft/40"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className={`inline-flex items-center justify-center size-16 rounded-2xl mb-4 ${accent}`}>
        {icon}
      </div>
      <h3 className="text-xl font-extrabold mb-2">{title}</h3>
      <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
    </Link>
  );
}

function Feature({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-3xl flex-shrink-0" aria-hidden>
        {emoji}
      </span>
      <div>
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
