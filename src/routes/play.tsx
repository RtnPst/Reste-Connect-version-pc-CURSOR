import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, GraduationCap, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Tu captes ?" },
      {
        name: "description",
        content: "Culture du jour, run rapide ou un thème — une intention à la fois.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-5 rounded-3xl border border-violet-400/35 bg-linear-to-br from-violet-950/70 via-indigo-950/60 to-orange-950/25 p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-violet-200">Jouer</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Par où tu entres ?</h1>
          <p className="mt-1 text-sm text-slate-200">Un fil culturel, puis le reste si tu veux.</p>
        </section>

        <Link
          to="/question-du-jour"
          className="group mb-5 flex flex-col rounded-3xl border-2 border-success/45 bg-linear-to-br from-emerald-950/50 via-success/10 to-card/90 p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-success/60 sm:p-6"
        >
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
            <Calendar className="size-7" aria-hidden />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-success">Moment culture</p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">Culture du jour</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Une question pour capter le fil du moment — la série suit si tu veux.
          </p>
          <p className="mt-4 text-sm font-extrabold text-success">
            Ouvrir le fil du jour <span aria-hidden>→</span>
          </p>
        </Link>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeCard
            to="/niveaux"
            icon={<Trophy className="size-7" />}
            title="Run rapide"
            description="Le raccourci pour te remettre dans le bain."
            actionLabel="Lancer le run"
            accent="bg-primary-soft text-primary"
          />
          <ModeCard
            to="/quiz"
            icon={<GraduationCap className="size-7" />}
            title="Un thème"
            description="Un angle du web — sans parcourir un catalogue."
            actionLabel="Choisir un thème"
            accent="bg-fuchsia-500/15 text-fuchsia-300"
            actionTone="text-fuchsia-300"
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
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  accent: string;
  actionTone?: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[9.5rem] flex-col rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_28px_-14px_rgba(15,23,42,0.75)]"
    >
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
