import { useMemo, useState } from "react";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { CockpitStatusBadge } from "@/components/admin-cockpit/CockpitStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminCockpitConceptIntake, ConceptIntakeRow } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  snapshot: AdminCockpitConceptIntake;
  loading: boolean;
  fetchWarning: string | null;
};

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function confidenceTone(c: string): "success" | "warning" | "muted" | "neutral" {
  const x = c.toLowerCase();
  if (x === "high") return "success";
  if (x === "medium") return "muted";
  if (x === "low") return "warning";
  return "neutral";
}

function decisionTone(d: string): "success" | "danger" | "warning" | "neutral" {
  const x = d.toLowerCase();
  if (x === "approve") return "success";
  if (x === "reject") return "danger";
  if (x === "watchlist") return "warning";
  return "neutral";
}

function RowCard({ row }: { row: ConceptIntakeRow }) {
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 md:hidden">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <CockpitStatusBadge tone={confidenceTone(row.confidence)}>
          Confiance: {row.confidence || "—"}
        </CockpitStatusBadge>
        <CockpitStatusBadge tone={decisionTone(row.human_decision)}>
          Décision: {row.human_decision || "—"}
        </CockpitStatusBadge>
        {row.decision_status ? (
          <CockpitStatusBadge tone="muted">Statut: {row.decision_status}</CockpitStatusBadge>
        ) : null}
      </div>
      <h3 className="mt-2 break-words text-base font-bold">{row.raw_term || "—"}</h3>
      <p className="text-xs text-muted-foreground break-all">
        Clé: <span className="font-mono">{row.suggested_concept_key || "—"}</span>
      </p>
      <p className="mt-1 text-sm">
        <span className="text-muted-foreground">Thème:</span> {row.suggested_theme || "—"}
      </p>
      {row.risk_flags.length > 0 ? (
        <div className="mt-2 flex min-w-0 flex-wrap gap-1">
          {row.risk_flags.map((f) => (
            <CockpitStatusBadge key={f} tone="warning" className="max-w-full">
              {f}
            </CockpitStatusBadge>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-sm break-words text-foreground/90">{row.short_definition}</p>
      {(row.aliases || row.example_usage) && (
        <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
          {row.aliases ? (
            <div>
              <dt className="font-semibold text-foreground/80">Alias</dt>
              <dd className="break-words">{row.aliases}</dd>
            </div>
          ) : null}
          {row.example_usage ? (
            <div>
              <dt className="font-semibold text-foreground/80">Exemple</dt>
              <dd className="break-words">{row.example_usage}</dd>
            </div>
          ) : null}
        </dl>
      )}
      <details className="mt-3 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-sm">
        <summary className="cursor-pointer font-semibold text-foreground">Notes & contrôles doublons</summary>
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p className="whitespace-pre-wrap break-words">
            <span className="font-semibold text-foreground/90">Notes: </span>
            {row.human_notes?.trim() ? row.human_notes : "—"}
          </p>
          <dl className="space-y-1 text-xs">
            <div>
              <dt className="font-semibold text-foreground/80">Doublon exact (clé)</dt>
              <dd className="break-words">{row.duplicate_check_exact_concept_key_match || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/80">Proche (clé existante)</dt>
              <dd className="break-words">{row.duplicate_check_near_existing_concept_key || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground/80">Sémantique possible</dt>
              <dd className="break-words">{row.duplicate_check_possible_semantic_duplicate || "—"}</dd>
            </div>
          </dl>
        </div>
      </details>
    </article>
  );
}

export function ConceptIntakeTab({ snapshot, loading, fetchWarning }: Props) {
  const [theme, setTheme] = useState<string>("all");
  const [confidence, setConfidence] = useState<string>("all");
  const [humanDecision, setHumanDecision] = useState<string>("all");
  const [riskFlag, setRiskFlag] = useState<string>("all");
  const [q, setQ] = useState("");

  const themes = useMemo(
    () => uniqSorted(snapshot.rows.map((r) => r.suggested_theme)),
    [snapshot.rows],
  );
  const confidences = useMemo(
    () => uniqSorted(snapshot.rows.map((r) => r.confidence)),
    [snapshot.rows],
  );
  const decisions = useMemo(() => {
    const set = new Set<string>();
    for (const r of snapshot.rows) {
      const d = r.human_decision.trim();
      set.add(d === "" ? "__empty__" : r.human_decision);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [snapshot.rows]);
  const riskOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of snapshot.rows) for (const f of r.risk_flags) if (f.trim()) set.add(f);
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [snapshot.rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return snapshot.rows.filter((row) => {
      if (theme !== "all" && row.suggested_theme !== theme) return false;
      if (confidence !== "all" && row.confidence !== confidence) return false;
      if (humanDecision !== "all") {
        const rowD = row.human_decision.trim();
        if (humanDecision === "__empty__") {
          if (rowD !== "") return false;
        } else if (row.human_decision !== humanDecision) return false;
      }
      if (riskFlag !== "all" && !row.risk_flags.includes(riskFlag)) return false;
      if (needle) {
        const hay = `${row.raw_term}\n${row.suggested_concept_key}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [snapshot.rows, theme, confidence, humanDecision, riskFlag, q]);

  const kpis = useMemo(() => {
    const total = snapshot.stats.total_rows ?? snapshot.rows.length;
    const withRisk = snapshot.rows.filter((r) => r.risk_flags.length > 0).length;
    const low = snapshot.rows.filter((r) => r.confidence.toLowerCase() === "low").length;
    const pendingDecision = snapshot.rows.filter((r) => !r.human_decision.trim()).length;
    return { total, withRisk, low, pendingDecision };
  }, [snapshot.rows, snapshot.stats.total_rows]);

  const warnings = fetchWarning ? [{ code: fetchWarning }] : [];

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Admin AI Cockpit — Concept intake</h1>
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
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Lignes (total)" value={String(kpis.total)} />
            <KpiCard label="Avec drapeaux risque" value={String(kpis.withRisk)} />
            <KpiCard label="Confiance basse" value={String(kpis.low)} />
            <KpiCard label="Décision humaine vide" value={String(kpis.pendingDecision)} />
          </div>

          <div className="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-card/60 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4">
            <div className="min-w-0 lg:col-span-1">
              <Label htmlFor="ci-theme">Thème suggéré</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="ci-theme" className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {themes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="ci-confidence">Confiance</Label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger id="ci-confidence" className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {confidences.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="ci-decision">Décision humaine</Label>
              <Select value={humanDecision} onValueChange={setHumanDecision}>
                <SelectTrigger id="ci-decision" className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {decisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === "__empty__" ? "(vide)" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="ci-risk">Drapeau risque</Label>
              <Select value={riskFlag} onValueChange={setRiskFlag}>
                <SelectTrigger id="ci-risk" className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {riskOptions.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="ci-q">Recherche (terme brut / clé concept)</Label>
              <Input
                id="ci-q"
                className="mt-1 min-w-0"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ex. brainrot, aura_farming…"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length} / {snapshot.rows.length} ligne(s) affichée(s)
          </p>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune ligne ne correspond aux filtres.
            </p>
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="p-2 font-bold">Terme</th>
                        <th className="p-2 font-bold">Clé</th>
                        <th className="p-2 font-bold">Thème</th>
                        <th className="p-2 font-bold">Confiance</th>
                        <th className="p-2 font-bold">Décision</th>
                        <th className="p-2 font-bold">Risques</th>
                        <th className="p-2 font-bold">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => (
                        <tr
                          key={`${row.suggested_concept_key}-${idx}`}
                          className="border-b border-border/50 align-top"
                        >
                          <td className="max-w-[140px] p-2 font-medium break-words">{row.raw_term}</td>
                          <td className="max-w-[120px] p-2 font-mono text-xs break-all">
                            {row.suggested_concept_key}
                          </td>
                          <td className="p-2 text-xs break-words">{row.suggested_theme}</td>
                          <td className="p-2">
                            <CockpitStatusBadge tone={confidenceTone(row.confidence)}>
                              {row.confidence || "—"}
                            </CockpitStatusBadge>
                          </td>
                          <td className="p-2">
                            <CockpitStatusBadge tone={decisionTone(row.human_decision)}>
                              {row.human_decision || "—"}
                            </CockpitStatusBadge>
                          </td>
                          <td className="max-w-[200px] p-2">
                            <div className="flex flex-wrap gap-1">
                              {row.risk_flags.length ? (
                                row.risk_flags.map((f) => (
                                  <CockpitStatusBadge key={f} tone="warning" className="text-[10px]">
                                    {f}
                                  </CockpitStatusBadge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[220px] p-2">
                            <details>
                              <summary className="cursor-pointer text-xs font-semibold text-primary">
                                Voir
                              </summary>
                              <div className="mt-1 max-h-48 space-y-2 overflow-y-auto text-xs break-words text-muted-foreground">
                                <p className="whitespace-pre-wrap">
                                  <span className="font-semibold text-foreground/85">Notes: </span>
                                  {row.human_notes?.trim() || "—"}
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground/85">Exact: </span>
                                  {row.duplicate_check_exact_concept_key_match || "—"}
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground/85">Proche: </span>
                                  {row.duplicate_check_near_existing_concept_key || "—"}
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground/85">Sémantique: </span>
                                  {row.duplicate_check_possible_semantic_duplicate || "—"}
                                </p>
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="min-w-0 space-y-3 md:hidden">
                {filtered.map((row, idx) => (
                  <RowCard key={`${row.suggested_concept_key}-m-${idx}`} row={row} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
