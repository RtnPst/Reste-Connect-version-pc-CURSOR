import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Flame,
  GraduationCap,
  Infinity as InfinityIcon,
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
      { title: "Tu captes ? — Tu captes vraiment les jeunes ?" },
      {
        name: "description",
        content: "Teste ton niveau en 2 minutes.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const maxUnlockedLevel = profile?.max_unlocked_level ?? 1;
  const hasProgression = Boolean(profile && (profile.total_xp > 0 || maxUnlockedLevel > 1));
  const continueCtaLabel = !user
    ? "Commencer mon parcours"
    : hasProgression
      ? maxUnlockedLevel > 1
        ? `Reprendre le niveau ${maxUnlockedLevel}`
        : "Continuer mon parcours"
      : "Commencer mon parcours";

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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />

      <main className="min-w-0 w-full flex-1 overflow-x-clip">
        {/* Hero (compact) */}
        <section className="container mx-auto max-w-5xl px-4 pt-6 pb-4 sm:px-6 sm:pt-10">
          <div className="mx-auto max-w-3xl animate-fade-in space-y-5 rounded-[2rem] border border-border/60 bg-card/70 px-4 py-6 text-center shadow-[var(--shadow-card)] backdrop-blur-sm sm:px-8 sm:py-8">
            <span className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90 sm:text-[13px]">
              Quiz culture web
            </span>
            <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-violet-400/28 bg-[#111a36]/82 px-4 py-5 shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_16px_34px_-24px_rgba(168,85,247,0.55)] sm:px-6 sm:py-7">
              <span
                className="pointer-events-none absolute -right-12 top-0 size-[11rem] rounded-full bg-fuchsia-500/[0.12] blur-3xl"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute -bottom-16 -left-10 size-[13rem] rounded-full bg-violet-500/[0.1] blur-3xl"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute right-0 top-1/2 size-[8rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-orange-400/[0.08] blur-3xl"
                aria-hidden
              />

              <div className="relative z-[1] mx-auto w-full max-w-[30rem] space-y-3">
                <h1 className="text-balance text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1]">
                  <span className="block text-slate-50">T’es sûr de capter…</span>
                  <span className="mt-1 block bg-linear-to-r from-fuchsia-300 via-violet-300 to-orange-300 bg-clip-text text-transparent">
                    ou t’es un peu mytho ?
                  </span>
                </h1>
                <p className="text-base font-medium text-slate-300/95 sm:text-lg">Teste ton niveau en 2 minutes</p>
              </div>
            </div>
            <div className="flex w-full min-w-0 justify-center px-1 pt-3 sm:px-0 sm:pt-4">
              <Button
                asChild
                size="xl"
                variant="default"
                className="h-auto min-h-[3.65rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-fuchsia-200/45 bg-linear-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-4 py-3 text-center text-white shadow-[0_0_0_1px_rgba(244,114,182,0.3),0_0_26px_-12px_rgba(236,72,153,0.72),0_18px_34px_-18px_rgba(249,115,22,0.62)] transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_0_0_1px_rgba(244,114,182,0.4),0_0_32px_-10px_rgba(236,72,153,0.82),0_22px_40px_-16px_rgba(249,115,22,0.76)] active:translate-y-[1px] active:scale-[0.985] active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 sm:min-h-[3.9rem] sm:max-w-[23rem] sm:px-6 sm:py-4"
              >
                <Link
                  to={user ? "/niveaux" : "/quiz"}
                  className="flex min-h-[2.75rem] w-full min-w-0 max-w-full items-center justify-center whitespace-normal break-words py-0.5 text-center text-[1.14rem] font-bold leading-none tracking-[-0.02em] [text-wrap:balance] sm:min-h-[3rem] sm:text-[1.24rem] sm:tracking-[-0.025em]"
                >
                  Je teste
                </Link>
              </Button>
            </div>

            {profile && profile.current_streak > 0 && (
              <div className="mx-auto max-w-md rounded-2xl border border-warning/35 bg-warning-soft/70 px-4 py-3 text-left">
                <p className="inline-flex items-center gap-2 font-bold text-warning-foreground">
                  <Flame className="size-5 text-warning" />
                  {profile.current_streak} jour{profile.current_streak > 1 ? "s" : ""} d'affilée !
                </p>
                <p className="mt-1 text-sm font-medium text-foreground/80">
                  Reviens demain pour garder ta série.
                </p>
              </div>
            )}

            {installPrompt && (
              <div className="pt-1.5">
                <div className="mx-auto max-w-xl rounded-2xl border border-border/35 bg-card/35 p-3.5 text-left shadow-[var(--shadow-soft)] sm:p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                    Installer l'app
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
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
                      Ajouter à l’écran d’accueil
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/90 sm:text-sm">
                    Chrome / Edge : bouton ci-dessus quand le navigateur le propose.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main actions first */}
        <section className="container mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              to="/niveaux"
              icon={<Trophy className="size-10" />}
              title="Test rapide"
              description="5 questions aléatoires pour tester ton niveau en 2 minutes chrono."
              accent="bg-primary-soft/80 text-primary"
              actionLabel="C'est parti"
              actionTone="text-primary"
              recommended
            />
            <ActionCard
              to="/quiz"
              icon={<GraduationCap className="size-10" />}
              title="Quiz par thème"
              description="10 questions sur la piste que tu choisis."
              accent="bg-warning-soft/80 text-warning"
              actionLabel="Choisir un thème"
              actionTone="text-warning"
            />
            <ActionCard
              to="/marathon"
              icon={<InfinityIcon className="size-10" />}
              title="Mode Marathon"
              description="Score infini : tu enchaînes tant que tu veux."
              accent="bg-warning-soft/70 text-warning"
              actionLabel="Je me lance"
              actionTone="text-warning"
            />
            <ActionCard
              to="/question-du-jour"
              icon={<Calendar className="size-10" />}
              title="Question du jour"
              description="Une question fraîche chaque jour."
              accent="bg-success-soft/80 text-success"
              actionLabel="Répondre"
              actionTone="text-success"
            />
            <ActionCard
              to={user ? "/duel" : "/connexion"}
              icon={<Swords className="size-10" />}
              title="Mode duel"
              description="Défie quelqu’un et compare les scores."
              accent="bg-warning-soft/85 text-warning"
              actionLabel="Défier quelqu'un"
              actionTone="text-warning"
            />
            <ActionCard
              to={user ? "/parcours" : "/connexion"}
              icon={<Trophy className="size-10" />}
              title="Tes badges"
              description={
                user
                  ? "Badges, parcours, un peu de flex."
                  : "Crée un compte pour garder tes badges et ta série."
              }
              accent="bg-primary-soft/80 text-primary"
              actionLabel="Voir mes badges"
              actionTone="text-primary"
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

        {/* Secondary intro */}
        <section className="container mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-4 sm:px-6">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5 text-center">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Expressions, réseaux, trends, internet : enchaîne les questions et vois si tu captes
              encore tout.
            </p>
          </div>
        </section>

        {/* Reassurance / accessibility */}
        <section className="container mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-12 sm:px-6">
          <div className="rounded-3xl bg-card border-2 border-border p-6 sm:p-10 shadow-[var(--shadow-soft)]">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 text-center">
              Pensé pour toi, vraiment.
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 text-base">
              <Feature emoji="🔊" title="Audio intégré">
                Une voix lit chaque question si tu veux.
              </Feature>
              <Feature emoji="🔠" title="Texte ajustable">
                Choisis la taille du texte qui te va.
              </Feature>
              <Feature emoji="🌈" title="Contraste élevé">
                Une option pour mieux voir les couleurs et le texte.
              </Feature>
              <Feature emoji="📚" title="Explications claires">
                Après chaque réponse, tu vois directement ce qu'il fallait capter.
              </Feature>
              <Feature emoji="⏱️" title="Sans chrono">
                Prends le temps qu’il te faut pour répondre.
              </Feature>
              <Feature emoji="⚡" title="Challenge cool">
                Tu te testes, tu progresses, et tu reviens faire mieux.
              </Feature>
            </div>
          </div>
        </section>

        {!user && (
          <section className="container mx-auto w-full min-w-0 max-w-3xl overflow-x-clip px-4 pb-16 text-center sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Prêt(e) à essayer ?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Commence sans inscription, ou crée un compte pour sauvegarder ta progression.
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
  actionLabel,
  actionTone,
  recommended = false,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  actionLabel: string;
  actionTone: string;
  recommended?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group relative flex min-h-[15.5rem] min-w-0 max-w-full flex-col rounded-[2rem] border bg-card/82 p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform hover:-translate-y-1 hover:scale-[1.012] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 sm:min-h-[16rem] sm:p-6 ${
        recommended
          ? "border-violet-400/65 shadow-[0_0_0_1px_rgba(167,139,250,0.26),0_0_22px_-12px_rgba(139,92,246,0.52),var(--shadow-soft)] hover:border-violet-300/80 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_28px_-10px_rgba(139,92,246,0.68),0_16px_34px_-16px_rgba(15,23,42,0.75)]"
          : "border-border/60 hover:border-primary/40 hover:shadow-[0_16px_34px_-16px_rgba(15,23,42,0.72)]"
      }`}
    >
      {recommended && (
        <span className="mb-3 ml-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-300/60 bg-violet-500/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-violet-100">
          🔥 RECOMMANDÉ
        </span>
      )}
      <div
        className={`mb-4 inline-flex size-14 items-center justify-center rounded-2xl ring-1 ring-border/50 shadow-[var(--shadow-soft)] transition-[transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-rotate-6 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0 sm:size-16 ${accent}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-extrabold">{title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
      <p
        className={`mt-auto pt-4 text-base font-extrabold ${actionTone}`}
        style={
          actionTone === "text-warning"
            ? {
                backgroundImage:
                  "linear-gradient(90deg, rgba(253,186,116,0.96), rgba(251,146,60,0.98) 55%, rgba(245,158,11,0.94))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }
            : undefined
        }
      >
        {actionLabel} <span aria-hidden>→</span>
      </p>
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
