import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, GraduationCap, Infinity as InfinityIcon, Swords, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Tu captes ?" },
      {
        name: "description",
        content: "Un mode, une intention — run court, thème, ou fil du jour.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-4 rounded-3xl border border-violet-400/40 bg-linear-to-br from-violet-950/70 via-indigo-950/60 to-orange-950/30 p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-violet-200">En session</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Comment tu découpes le web ?</h1>
          <p className="mt-1 text-sm text-slate-200">Un mode, une intention — court, thème, ou endurance.</p>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <ModeCard
            to="/niveaux"
            icon={<Trophy className="size-8" />}
            title="Run rapide"
            description="Le raccourci pour te remettre dans le bain."
            actionLabel="Lancer le run"
            accent="bg-primary-soft text-primary"
          />
          <ModeCard
            to="/quiz"
            icon={<GraduationCap className="size-8" />}
            title="Quiz par thème"
            description="Un thème, une vibe — tu décryptes à ton rythme."
            actionLabel="Choisir un thème"
            accent="bg-fuchsia-500/15 text-fuchsia-300"
            actionTone="text-fuchsia-300"
          />
          <ModeCard
            to="/marathon"
            icon={<InfinityIcon className="size-8" />}
            title="Marathon"
            description="Enchaîne tant que ça te dit — sans pression de perf."
            actionLabel="Tenir la session"
            accent="bg-warning-soft text-warning"
            actionTone="text-warning"
          />
          <ModeCard
            to={user ? "/duel" : "/connexion"}
            icon={<Swords className="size-8" />}
            title="Duel"
            description="Face à face, score contre score."
            actionLabel="Lancer un défi"
            accent="bg-cyan-500/15 text-cyan-300"
            actionTone="text-cyan-300"
            kicker="Bientôt dispo !"
          />
          <ModeCard
            to="/question-du-jour"
            icon={<Calendar className="size-8" />}
            title="Culture du jour"
            description="Une question pour capter le moment — la série suit si tu veux."
            actionLabel="Ouvrir le fil du jour"
            accent="bg-success-soft text-success"
            actionTone="text-success"
            cardClassName="col-span-2 lg:col-span-1"
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  to,
  icon,
  title,
  description,
  actionLabel,
  accent,
  actionTone,
  cardClassName,
  kicker,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  accent: string;
  actionTone?: string;
  cardClassName?: string;
  kicker?: string;
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-[10.75rem] flex-col rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_28px_-14px_rgba(15,23,42,0.75)] ${cardClassName ?? ""}`}
    >
      {kicker && (
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-fuchsia-300">
          {kicker}
        </p>
      )}
      <div className={`mb-2 inline-flex size-10 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className={`mt-auto pt-2 text-sm font-extrabold ${actionTone ?? "text-primary"}`}>
        {actionLabel} <span aria-hidden>→</span>
      </p>
    </Link>
  );
}
