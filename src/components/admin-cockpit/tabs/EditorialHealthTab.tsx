import { useMemo, useState, type ReactNode } from "react";
import { CockpitStatusBadge } from "@/components/admin-cockpit/CockpitStatusBadge";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdminCockpitEditorialHealth,
  EditorialFreshnessRow,
  EditorialNeedsRefreshRow,
  EditorialOverexposureRow,
  EditorialPriorityQueueRow,
} from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  snapshot: AdminCockpitEditorialHealth;
  loading: boolean;
  fetchWarning: string | null;
};

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function bucketTone(s: string): "neutral" | "warning" | "success" | "muted" | "danger" {
  const x = s.toLowerCase();
  if (x.includes("critical") || x.includes("soon")) return "warning";
  if (x.includes("watch")) return "muted";
  if (x.includes("parked") || x.includes("low")) return "neutral";
  if (x.includes("monitor")) return "success";
  return "neutral";
}

function severityTone(s: string): "neutral" | "warning" | "danger" | "muted" {
  const x = s.toLowerCase();
  if (x === "high" || x === "critical") return "danger";
  if (x === "medium") return "warning";
  if (x === "low") return "muted";
  return "neutral";
}

function SectionShell({
  title,
  description,
  kpis,
  children,
}: {
  title: string;
  description?: string;
  kpis: ReactNode;
  children: ReactNode;
}) {
  return (
    <details open className="min-w-0 rounded-xl border border-border/70 bg-card/60">
      <summary className="cursor-pointer list-none px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="text-base font-extrabold">{title}</span>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </summary>
      <div className="border-t border-border/60 px-3 pb-4 pt-2 sm:px-4">
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{kpis}</div>
        {children}
      </div>
    </details>
  );
}

function SimpleDataTable({
  minWidth,
  headers,
  rows,
}: {
  minWidth: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className={`w-full min-w-0 border-collapse text-left text-sm ${minWidth}`}>
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-t border-border/50 align-top">
              {cells.map((c, ci) => (
                <td key={ci} className="p-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EditorialHealthTab({ snapshot, loading, fetchWarning }: Props) {
  const [pqBucket, setPqBucket] = useState("all");
  const [pqQ, setPqQ] = useState("");
  const [frBand, setFrBand] = useState("all");
  const [frQ, setFrQ] = useState("");
  const [nrSev, setNrSev] = useState("all");
  const [nrQ, setNrQ] = useState("");
  const [oeBand, setOeBand] = useState("all");
  const [oeQ, setOeQ] = useState("");

  const pqBuckets = useMemo(
    () => uniqSorted(snapshot.priority_queue.rows.map((r) => r.priority_bucket)),
    [snapshot.priority_queue.rows],
  );
  const frBands = useMemo(
    () => uniqSorted(snapshot.freshness.rows.map((r) => r.freshness_band)),
    [snapshot.freshness.rows],
  );
  const nrSevs = useMemo(
    () => uniqSorted(snapshot.needs_refresh.rows.map((r) => r.severity)),
    [snapshot.needs_refresh.rows],
  );
  const oeBands = useMemo(
    () => uniqSorted(snapshot.overexposure.rows.map((r) => r.saturation_risk_band)),
    [snapshot.overexposure.rows],
  );

  const pqFiltered = useMemo(() => {
    const n = pqQ.trim().toLowerCase();
    return snapshot.priority_queue.rows.filter((r) => {
      if (pqBucket !== "all" && r.priority_bucket !== pqBucket) return false;
      if (n) {
        const h = `${r.raw_term}\n${r.suggested_concept_key}`.toLowerCase();
        if (!h.includes(n)) return false;
      }
      return true;
    });
  }, [snapshot.priority_queue.rows, pqBucket, pqQ]);

  const frFiltered = useMemo(() => {
    const n = frQ.trim().toLowerCase();
    return snapshot.freshness.rows.filter((r) => {
      if (frBand !== "all" && r.freshness_band !== frBand) return false;
      if (n) {
        const h = `${r.raw_term}\n${r.concept_key}`.toLowerCase();
        if (!h.includes(n)) return false;
      }
      return true;
    });
  }, [snapshot.freshness.rows, frBand, frQ]);

  const nrFiltered = useMemo(() => {
    const n = nrQ.trim().toLowerCase();
    return snapshot.needs_refresh.rows.filter((r) => {
      if (nrSev !== "all" && r.severity !== nrSev) return false;
      if (n) {
        const h = `${r.raw_term}\n${r.concept_key}`.toLowerCase();
        if (!h.includes(n)) return false;
      }
      return true;
    });
  }, [snapshot.needs_refresh.rows, nrSev, nrQ]);

  const oeFiltered = useMemo(() => {
    const n = oeQ.trim().toLowerCase();
    return snapshot.overexposure.rows.filter((r) => {
      if (oeBand !== "all" && r.saturation_risk_band !== oeBand) return false;
      if (n && !r.concept_key.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [snapshot.overexposure.rows, oeBand, oeQ]);

  const warnings = fetchWarning ? [{ code: fetchWarning }] : [];

  const pqKpis = (
    <>
      <KpiCard label="File (lignes)" value={String(snapshot.priority_queue.total_rows ?? snapshot.priority_queue.rows.length)} />
      <KpiCard label="Affichées" value={String(pqFiltered.length)} />
    </>
  );

  const frKpis = (
    <>
      <KpiCard label="Freshness (lignes)" value={String(snapshot.freshness.total_rows ?? snapshot.freshness.rows.length)} />
      <KpiCard label="Affichées" value={String(frFiltered.length)} />
    </>
  );

  const nrKpis = (
    <>
      <KpiCard label="Refresh (lignes)" value={String(snapshot.needs_refresh.total_rows ?? snapshot.needs_refresh.rows.length)} />
      <KpiCard label="Affichées" value={String(nrFiltered.length)} />
    </>
  );

  const oeKpis = (
    <>
      <KpiCard label="Surexposition (lignes)" value={String(snapshot.overexposure.total_rows ?? snapshot.overexposure.rows.length)} />
      <KpiCard label="Affichées" value={String(oeFiltered.length)} />
      <KpiCard
        label="Evergreen (compteur agrégé)"
        value={String(snapshot.safe_evergreen_counts_only.total_rows ?? "—")}
      />
    </>
  );

  const renderPqMobile = (r: EditorialPriorityQueueRow, idx: number) => (
    <article key={`pq-m-${idx}`} className="rounded-lg border border-border/60 p-3 md:hidden">
      <div className="flex flex-wrap gap-1">
        <CockpitStatusBadge tone={bucketTone(r.priority_bucket)}>{r.priority_bucket || "—"}</CockpitStatusBadge>
        <CockpitStatusBadge tone="muted">{r.confidence || "—"}</CockpitStatusBadge>
      </div>
      <p className="mt-2 font-bold break-words">{r.raw_term}</p>
      <p className="text-xs break-all text-muted-foreground">{r.suggested_concept_key}</p>
      <p className="mt-1 text-xs break-words">{r.queue_reason}</p>
    </article>
  );

  const renderFrMobile = (r: EditorialFreshnessRow, idx: number) => (
    <article key={`fr-m-${idx}`} className="rounded-lg border border-border/60 p-3 md:hidden">
      <CockpitStatusBadge tone={bucketTone(r.freshness_band)}>{r.freshness_band || "—"}</CockpitStatusBadge>
      <p className="mt-2 font-bold break-words">{r.raw_term}</p>
      <p className="text-xs break-all">{r.concept_key}</p>
      <p className="mt-1 text-xs text-muted-foreground break-words">{r.refresh_note}</p>
    </article>
  );

  const renderNrMobile = (r: EditorialNeedsRefreshRow, idx: number) => (
    <article key={`nr-m-${idx}`} className="rounded-lg border border-border/60 p-3 md:hidden">
      <CockpitStatusBadge tone={severityTone(r.severity)}>{r.severity || "—"}</CockpitStatusBadge>
      <p className="mt-2 font-bold break-words">{r.raw_term}</p>
      <p className="text-xs break-all">{r.concept_key}</p>
      <p className="mt-1 text-xs break-words">{r.action_note}</p>
    </article>
  );

  const renderOeMobile = (r: EditorialOverexposureRow, idx: number) => (
    <article key={`oe-m-${idx}`} className="rounded-lg border border-border/60 p-3 md:hidden">
      <CockpitStatusBadge tone={bucketTone(r.saturation_risk_band)}>{r.saturation_risk_band || "—"}</CockpitStatusBadge>
      <p className="mt-2 font-mono text-sm font-bold break-all">{r.concept_key}</p>
      <p className="mt-1 text-xs text-muted-foreground break-words">{r.review_note}</p>
    </article>
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Admin AI Cockpit — Santé éditoriale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot: {snapshot.generated_at || "non disponible"}
        </p>
      </div>
      <ReadOnlyBanner />
      <WarningList title="Avertissements snapshot" warnings={warnings} />

      {loading ? (
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
          Chargement du snapshot…
        </div>
      ) : (
        <div className="space-y-4">
          <SectionShell
            title="File prioritaire"
            description="Concepts à traiter selon le bucket éditorial."
            kpis={pqKpis}
          >
            <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="eh-pq-b">Bucket</Label>
                <Select value={pqBucket} onValueChange={setPqBucket}>
                  <SelectTrigger id="eh-pq-b" className="mt-1 min-w-0">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {pqBuckets.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eh-pq-q">Recherche</Label>
                <Input id="eh-pq-q" className="mt-1 min-w-0" value={pqQ} onChange={(e) => setPqQ(e.target.value)} />
              </div>
            </div>
            <div className="hidden md:block">
              <SimpleDataTable
                minWidth="min-w-[720px]"
                headers={["Terme", "Clé", "Thème", "Bucket", "Confiance", "Raison"]}
                rows={pqFiltered.map((r) => [
                  <span key="t" className="break-words font-medium">
                    {r.raw_term}
                  </span>,
                  <span key="k" className="break-all font-mono text-xs">
                    {r.suggested_concept_key}
                  </span>,
                  <span key="th" className="break-words text-xs">
                    {r.suggested_theme}
                  </span>,
                  <CockpitStatusBadge key="b" tone={bucketTone(r.priority_bucket)}>
                    {r.priority_bucket}
                  </CockpitStatusBadge>,
                  <span key="c" className="text-xs">
                    {r.confidence}
                  </span>,
                  <span key="q" className="break-words text-xs text-muted-foreground">
                    {r.queue_reason}
                  </span>,
                ])}
              />
            </div>
            <div className="space-y-2 md:hidden">
              {pqFiltered.map((r, i) => renderPqMobile(r, i))}
            </div>
          </SectionShell>

          <SectionShell
            title="Fraîcheur"
            description="Scores et bandes de fraîcheur éditoriale."
            kpis={frKpis}
          >
            <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="eh-fr-b">Bande</Label>
                <Select value={frBand} onValueChange={setFrBand}>
                  <SelectTrigger id="eh-fr-b" className="mt-1 min-w-0">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {frBands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eh-fr-q">Recherche</Label>
                <Input id="eh-fr-q" className="mt-1 min-w-0" value={frQ} onChange={(e) => setFrQ(e.target.value)} />
              </div>
            </div>
            <div className="hidden md:block">
              <SimpleDataTable
                minWidth="min-w-[760px]"
                headers={["Terme", "Clé", "Bande", "Score", "Note"]}
                rows={frFiltered.map((r) => [
                  <span key="t" className="break-words font-medium">
                    {r.raw_term}
                  </span>,
                  <span key="k" className="break-all font-mono text-xs">
                    {r.concept_key}
                  </span>,
                  <CockpitStatusBadge key="b" tone={bucketTone(r.freshness_band)}>
                    {r.freshness_band}
                  </CockpitStatusBadge>,
                  <span key="s">{r.freshness_score ?? "—"}</span>,
                  <span key="n" className="max-w-[220px] break-words text-xs text-muted-foreground">
                    {r.refresh_note}
                  </span>,
                ])}
              />
            </div>
            <div className="space-y-2 md:hidden">
              {frFiltered.map((r, i) => renderFrMobile(r, i))}
            </div>
          </SectionShell>

          <SectionShell
            title="Besoin de rafraîchissement"
            description="Concepts à replanifier ou revérifier."
            kpis={nrKpis}
          >
            <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="eh-nr-s">Sévérité</Label>
                <Select value={nrSev} onValueChange={setNrSev}>
                  <SelectTrigger id="eh-nr-s" className="mt-1 min-w-0">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {nrSevs.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eh-nr-q">Recherche</Label>
                <Input id="eh-nr-q" className="mt-1 min-w-0" value={nrQ} onChange={(e) => setNrQ(e.target.value)} />
              </div>
            </div>
            <div className="hidden md:block">
              <SimpleDataTable
                minWidth="min-w-[700px]"
                headers={["Terme", "Clé", "Sévérité", "Raison refresh", "Action"]}
                rows={nrFiltered.map((r) => [
                  <span key="t" className="break-words font-medium">
                    {r.raw_term}
                  </span>,
                  <span key="k" className="break-all font-mono text-xs">
                    {r.concept_key}
                  </span>,
                  <CockpitStatusBadge key="s" tone={severityTone(r.severity)}>
                    {r.severity}
                  </CockpitStatusBadge>,
                  <span key="rr" className="break-words text-xs">
                    {r.refresh_reason}
                  </span>,
                  <span key="a" className="max-w-[200px] break-words text-xs text-muted-foreground">
                    {r.action_note}
                  </span>,
                ])}
              />
            </div>
            <div className="space-y-2 md:hidden">
              {nrFiltered.map((r, i) => renderNrMobile(r, i))}
            </div>
          </SectionShell>

          <SectionShell
            title="Surexposition"
            description="Charge brouillons / variantes et risque de saturation."
            kpis={oeKpis}
          >
            <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="eh-oe-b">Bande risque</Label>
                <Select value={oeBand} onValueChange={setOeBand}>
                  <SelectTrigger id="eh-oe-b" className="mt-1 min-w-0">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {oeBands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eh-oe-q">Concept key</Label>
                <Input id="eh-oe-q" className="mt-1 min-w-0" value={oeQ} onChange={(e) => setOeQ(e.target.value)} />
              </div>
            </div>
            <div className="hidden md:block">
              <SimpleDataTable
                minWidth="min-w-[800px]"
                headers={["Concept", "Bande", "Index", "Brouillons", "Note"]}
                rows={oeFiltered.map((r) => [
                  <span key="c" className="break-all font-mono text-xs">
                    {r.concept_key}
                  </span>,
                  <CockpitStatusBadge key="b" tone={bucketTone(r.saturation_risk_band)}>
                    {r.saturation_risk_band}
                  </CockpitStatusBadge>,
                  <span key="i">{r.saturation_index ?? "—"}</span>,
                  <span key="d" className="text-xs whitespace-nowrap">
                    déf {r.draft_definition_count ?? "—"} · ctx {r.draft_contextual_count ?? "—"}
                  </span>,
                  <span key="n" className="max-w-[240px] break-words text-xs text-muted-foreground">
                    {r.review_note}
                  </span>,
                ])}
              />
            </div>
            <div className="space-y-2 md:hidden">
              {oeFiltered.map((r, i) => renderOeMobile(r, i))}
            </div>
          </SectionShell>
        </div>
      )}
    </div>
  );
}
