import { ArrowRight, FileQuestion, ListChecks, Sparkles } from "lucide-react";
import { AdminDailyFilCard } from "@/components/admin-cockpit/AdminDailyFilCard";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";

const KPI_LABELS: Record<string, string> = {
  live_questions: "Questions en ligne",
  live_questions_count: "Questions en ligne",
  draft_questions: "Brouillons",
  archived_questions: "Archivées",
  daily_ready: "Daily prêt",
  concept_key_coverage_pct: "Concepts tagués (%)",
};

function kpiLabel(key: string): string {
  return KPI_LABELS[key] ?? key.replaceAll("_", " ");
}

type Props = {
  loading: boolean;
  kpis: Record<string, number | boolean>;
  onAddQuestion: () => void;
  onManageQuestions: () => void;
  onOpenExpert: () => void;
};

export function AdminSimplePanel({
  loading,
  kpis,
  onAddQuestion,
  onManageQuestions,
  onOpenExpert,
}: Props) {
  const entries = Object.entries(kpis).slice(0, 4);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Mode simple</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          L’essentiel pour faire vivre Tu Captes — le reste reste en mode expert.
        </p>
      </header>

      <section className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Aujourd’hui</p>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Chargement du snapshot…</p>
        ) : entries.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {entries.map(([key, value]) => (
              <KpiCard key={key} label={kpiLabel(key)} value={String(value)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Pas de chiffres snapshot pour l’instant — tu peux quand même gérer les questions.
          </p>
        )}
      </section>

      <AdminDailyFilCard />

      <section className="space-y-3">
        <Button
          type="button"
          size="lg"
          variant="accent"
          className="h-auto min-h-[3.25rem] w-full justify-between whitespace-normal py-3 text-left"
          onClick={onAddQuestion}
        >
          <span className="flex items-center gap-3">
            <FileQuestion className="size-5 shrink-0" aria-hidden />
            <span>
              <span className="block font-extrabold">Ajouter une question</span>
              <span className="block text-xs font-medium opacity-90">Formulaire classique, publication directe</span>
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-auto min-h-[3.25rem] w-full justify-between whitespace-normal py-3 text-left"
          onClick={onManageQuestions}
        >
          <span className="flex items-center gap-3">
            <ListChecks className="size-5 shrink-0" aria-hidden />
            <span>
              <span className="block font-extrabold">Voir & modifier les questions</span>
              <span className="block text-xs font-medium text-muted-foreground">Liste, filtres, activer / masquer</span>
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Button>
      </section>

      <section className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2 font-semibold text-foreground/90">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Mode expert
        </p>
        <p className="mt-1 leading-relaxed">
          Cockpit complet (analytics, batches, intake concepts…) — uniquement si tu en as besoin.
        </p>
        <Button type="button" variant="ghost" size="sm" className="mt-2 px-0 font-semibold" onClick={onOpenExpert}>
          Ouvrir le mode expert
          <ArrowRight className="size-4" />
        </Button>
      </section>
    </div>
  );
}
