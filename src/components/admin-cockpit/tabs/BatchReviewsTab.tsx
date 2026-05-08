import { useMemo, useState } from "react";
import { CockpitStatusBadge } from "@/components/admin-cockpit/CockpitStatusBadge";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminCockpitBatchReviews, BatchReviewRow } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  snapshot: AdminCockpitBatchReviews;
  loading: boolean;
  fetchWarning: string | null;
};

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function riskTone(r: string): "neutral" | "warning" | "danger" | "muted" {
  const x = r.toLowerCase();
  if (x.includes("high")) return "danger";
  if (x.includes("medium")) return "warning";
  if (x.includes("low")) return "muted";
  return "neutral";
}

export function BatchReviewsTab({ snapshot, loading, fetchWarning }: Props) {
  const [risk, setRisk] = useState("all");
  const [action, setAction] = useState("all");
  const [category, setCategory] = useState("all");
  const [archiveLater, setArchiveLater] = useState("all");
  const [conceptQ, setConceptQ] = useState("");

  const risks = useMemo(() => uniqSorted(snapshot.rows.map((r) => r.risk_level)), [snapshot.rows]);
  const actions = useMemo(() => uniqSorted(snapshot.rows.map((r) => r.recommended_action)), [snapshot.rows]);
  const categories = useMemo(() => uniqSorted(snapshot.rows.map((r) => r.category)), [snapshot.rows]);
  const archiveOpts = useMemo(() => uniqSorted(snapshot.rows.map((r) => r.archive_only_later)), [snapshot.rows]);

  const filtered = useMemo(() => {
    const n = conceptQ.trim().toLowerCase();
    return snapshot.rows.filter((row) => {
      if (risk !== "all" && row.risk_level !== risk) return false;
      if (action !== "all" && row.recommended_action !== action) return false;
      if (category !== "all" && row.category !== category) return false;
      if (archiveLater !== "all" && row.archive_only_later !== archiveLater) return false;
      if (n && !row.concept_key.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [snapshot.rows, risk, action, category, archiveLater, conceptQ]);

  const warnings = fetchWarning ? [{ code: fetchWarning }] : [];
  const totalQ = snapshot.rows.reduce((acc, r) => acc + r.question_count, 0);

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere] sm:text-3xl">Admin AI Cockpit — Revues batch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot: {snapshot.generated_at || "non disponible"} · champs sensibles (IDs questions) exclus du rendu.
        </p>
      </div>
      <ReadOnlyBanner />
      <WarningList title="Avertissements snapshot" warnings={warnings} />

      <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-3 text-xs sm:text-sm">
        <strong className="text-foreground">Redaction :</strong> le champ technique listant les statuts par ID de
        question n&apos;est pas parsé ni affiché. Seul <code className="rounded bg-muted px-1">question_count</code>{" "}
        résume le volume.
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[5.5rem] items-center justify-center rounded-xl border border-border/70 bg-card/60 px-4 py-6 text-sm text-muted-foreground"
        >
          Chargement du snapshot…
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Groupes / lignes" value={String(snapshot.rows.length)} />
            <KpiCard label="Questions (somme des counts)" value={String(totalQ)} />
            <KpiCard label="Affichées (filtre)" value={String(filtered.length)} />
          </div>

          <div className="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-card/60 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4">
            <div className="min-w-0">
              <Label htmlFor="br-risk">Risk level</Label>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger id="br-risk" className="mt-1 h-auto min-h-10 min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {risks.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="br-action">Action recommandée</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="br-action" className="mt-1 h-auto min-h-10 min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {actions.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="br-cat">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="br-cat" className="mt-1 h-auto min-h-10 min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="br-arch">Archive only later</Label>
              <Select value={archiveLater} onValueChange={setArchiveLater}>
                <SelectTrigger id="br-arch" className="mt-1 h-auto min-h-10 min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {archiveOpts.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <Label htmlFor="br-cq">Recherche concept key</Label>
              <Input
                id="br-cq"
                className="mt-1 min-h-10 min-w-0 sm:min-h-9"
                value={conceptQ}
                onChange={(e) => setConceptQ(e.target.value)}
                placeholder="ex. brainrot…"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 shrink-0"
              onClick={() => {
                setRisk("all");
                setAction("all");
                setCategory("all");
                setArchiveLater("all");
                setConceptQ("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground">
              Aucune ligne ne correspond aux filtres.
            </p>
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <div className="touch-pan-x overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 font-bold">Groupe</th>
                        <th className="p-2 font-bold">Concept</th>
                        <th className="p-2 font-bold"># Q</th>
                        <th className="p-2 font-bold">Risque</th>
                        <th className="p-2 font-bold">Action</th>
                        <th className="p-2 font-bold">Catégorie</th>
                        <th className="p-2 font-bold">Raison</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => (
                        <tr key={`${row.duplicate_group_id}-${idx}`} className="border-b border-border/50 align-top">
                          <td className="max-w-[140px] p-2 font-mono text-[11px] break-all">{row.duplicate_group_id}</td>
                          <td className="max-w-[120px] p-2 font-mono text-xs break-all">{row.concept_key}</td>
                          <td className="p-2 whitespace-nowrap">
                            <CockpitStatusBadge tone="muted">{row.question_count}</CockpitStatusBadge>
                          </td>
                          <td className="p-2">
                            <CockpitStatusBadge tone={riskTone(row.risk_level)}>{row.risk_level}</CockpitStatusBadge>
                          </td>
                          <td className="max-w-[200px] p-2">
                            <CockpitStatusBadge tone="neutral" className="text-[10px]">
                              {row.recommended_action}
                            </CockpitStatusBadge>
                          </td>
                          <td className="max-w-[180px] p-2">
                            <CockpitStatusBadge tone="muted" className="text-[10px]">
                              {row.category}
                            </CockpitStatusBadge>
                          </td>
                          <td className="max-w-[260px] p-2 text-xs break-words text-muted-foreground">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {filtered.map((row, idx) => (
                  <BatchCard key={`${row.duplicate_group_id}-m-${idx}`} row={row} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function BatchCard({ row }: { row: BatchReviewRow }) {
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-card/70 p-3">
      <div className="flex flex-wrap gap-1.5">
        <CockpitStatusBadge tone={riskTone(row.risk_level)}>{row.risk_level}</CockpitStatusBadge>
        <CockpitStatusBadge tone="muted"># questions: {row.question_count}</CockpitStatusBadge>
        <CockpitStatusBadge tone="muted">archive later: {row.archive_only_later || "—"}</CockpitStatusBadge>
      </div>
      <p className="mt-2 font-mono text-xs font-bold break-all">{row.concept_key}</p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">{row.duplicate_group_id}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <CockpitStatusBadge tone="neutral" className="max-w-full text-[10px]">
          {row.recommended_action}
        </CockpitStatusBadge>
        <CockpitStatusBadge tone="muted" className="max-w-full text-[10px]">
          {row.category}
        </CockpitStatusBadge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground break-words">{row.reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        diff difficulté: {row.difficulty_differences || "—"} · choix: {row.choice_differences || "—"} · explication:{" "}
        {row.explanation_differences || "—"}
      </p>
    </article>
  );
}
