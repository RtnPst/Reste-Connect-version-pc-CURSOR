import type { ReactNode } from "react";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { CockpitStatusBadge } from "@/components/admin-cockpit/CockpitStatusBadge";
import type { AdminCockpitAnalyticsSummary } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  snapshot: AdminCockpitAnalyticsSummary;
  loading: boolean;
  fetchWarning: string | null;
};

function AggTable({
  title,
  headers,
  rows,
  minW,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  minW: string;
}) {
  if (!rows.length) {
    return (
      <div className="min-h-[3.25rem] rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground">
        {title} — aucune ligne.
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="touch-pan-x overflow-x-auto rounded-lg border border-border/60">
        <table className={`w-full min-w-0 border-collapse text-left text-sm ${minW}`}>
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-2 py-2.5 font-bold sm:px-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, ri) => (
              <tr key={ri} className="border-t border-border/50 align-top">
                {cells.map((c, ci) => (
                  <td key={ci} className="px-2 py-2.5 break-words sm:px-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnalyticsTab({ snapshot, loading, fetchWarning }: Props) {
  const warnings = fetchWarning ? [{ code: fetchWarning }] : [];
  const p0 = snapshot.phase0;
  const p1 = snapshot.phase1;

  const summaryEntries = Object.entries(p0.summary);
  const safetyEntries = Object.entries(snapshot.safety);

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere] sm:text-3xl">Admin AI Cockpit — Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot: {snapshot.generated_at || "non disponible"} · agrégats uniquement, pas d&apos;événements bruts.
        </p>
      </div>
      <ReadOnlyBanner />
      <WarningList title="Avertissements snapshot" warnings={warnings} />

      <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-3 text-sm sm:p-4">
        <p className="font-bold text-foreground">Confidentialité (extrait snapshot)</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {safetyEntries.length ? (
            safetyEntries.map(([k, v]) => (
              <li key={k}>
                <CockpitStatusBadge tone={v ? "success" : "warning"}>
                  {k}: {v ? "oui" : "non"}
                </CockpitStatusBadge>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">Aucune métadonnée « safety » dans le fichier.</li>
          )}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Aucun identifiant utilisateur, aucune ligne d&apos;événement brute ni props d&apos;événements : uniquement des
          volumes et distributions agrégées fournis par le générateur de snapshot.
        </p>
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
        <div className="min-w-0 space-y-6">
          <div className="min-w-0">
            <h2 className="mb-2 text-lg font-extrabold">Phase 0 — tentatives & répartition</h2>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryEntries.length ? (
                summaryEntries.map(([k, v]) => (
                  <KpiCard key={k} label={k.replaceAll("_", " ")} value={String(v)} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2">Résumé Phase 0 vide ou absent.</p>
              )}
            </div>
          </div>

          <AggTable
            title="Tentatives dans le temps"
            headers={["Date", "Tentatives"]}
            minW="min-w-[280px]"
            rows={p0.attempts_over_time.map((r) => [r.date, String(r.attempt_count ?? "—")])}
          />
          <AggTable
            title="Répartition par mode"
            headers={["Mode", "Tentatives", "% part"]}
            minW="min-w-[360px]"
            rows={p0.mode_distribution.map((r) => [
              r.mode,
              String(r.attempt_count ?? "—"),
              r.share_percent != null ? `${r.share_percent}%` : "—",
            ])}
          />
          <AggTable
            title="Popularité par thème"
            headers={["Thème", "Tentatives", "% part"]}
            minW="min-w-[400px]"
            rows={p0.theme_popularity.map((r) => [
              r.theme,
              String(r.attempt_count ?? "—"),
              r.share_percent != null ? `${r.share_percent}%` : "—",
            ])}
          />
          <AggTable
            title="Bandes de précision"
            headers={["Bande", "Tentatives", "% part"]}
            minW="min-w-[360px]"
            rows={p0.accuracy_bands.map((r) => [
              r.band,
              String(r.attempt_count ?? "—"),
              r.share_percent != null ? `${r.share_percent}%` : "—",
            ])}
          />
          <AggTable
            title="Proxies retour (agrégats)"
            headers={["Métrique", "Valeur"]}
            minW="min-w-[320px]"
            rows={p0.returning_user_proxy.map((r) => [r.metric, String(r.value ?? "—")])}
          />
          <AggTable
            title="Profils — résumé (quantiles agrégés)"
            headers={["Métrique", "Valeur", "Dimension"]}
            minW="min-w-[420px]"
            rows={p0.profiles_summary.map((r) => [r.metric, String(r.value ?? "—"), r.dimension])}
          />

          <div>
            <h2 className="mb-2 text-lg font-extrabold">Phase 1 — événements analytics agrégés</h2>
            <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2">
              <KpiCard
                label="Événements analytics disponibles"
                value={p1.analytics_events_available ? "oui" : "non"}
              />
              <KpiCard label="Volume événements (compte)" value={String(p1.analytics_event_count ?? "—")} />
            </div>
            <AggTable
              title="Démarrages vs complétions par mode"
              headers={["Mode", "Starts", "Complétions", "% complétion"]}
              minW="min-w-[440px]"
              rows={p1.starts_vs_completions_by_mode.map((r) => [
                r.mode,
                String(r.starts ?? "—"),
                String(r.completions ?? "—"),
                r.completion_rate_percent != null ? `${r.completion_rate_percent}%` : "—",
              ])}
            />
            <AggTable
              title="Fin de marathon (sessions terminées par bande)"
              headers={["Bande bonnes réponses", "Sessions"]}
              minW="min-w-[320px]"
              rows={p1.marathon_end_distribution.map((r) => [r.correct_band, String(r.ended_sessions ?? "—")])}
            />
            <AggTable
              title="CTA post-parcours (agrégat)"
              headers={["Mode", "Clics", "Complétions", "CTR %"]}
              minW="min-w-[440px]"
              rows={p1.cta_clickthrough_summary.map((r) => [
                r.mode,
                String(r.clicks ?? "—"),
                String(r.completions ?? "—"),
                r.click_through_percent != null ? `${r.click_through_percent}%` : "—",
              ])}
            />
            <AggTable
              title="Volume d&apos;événements (nom × mode)"
              headers={["Événement", "Mode", "Nombre"]}
              minW="min-w-[480px]"
              rows={p1.event_volume_by_event_name_mode.map((r) => [
                r.event_name,
                r.mode,
                String(r.count ?? "—"),
              ])}
            />
            <AggTable
              title="Contrôles qualité données (compteurs)"
              headers={["Métrique", "Valeur"]}
              minW="min-w-[360px]"
              rows={p1.data_quality_checks.map((r) => [r.metric, String(r.value ?? "—")])}
            />
            {p1.level_pass_fail_summary.length > 0 ? (
              <AggTable
                title="Niveaux — réussite / échec (agrégat)"
                headers={["Bande / outcome", "Pass", "Fail"]}
                minW="min-w-[360px]"
                rows={p1.level_pass_fail_summary.map((r) => [
                  r.band,
                  String(r.pass ?? "—"),
                  String(r.fail ?? "—"),
                ])}
              />
            ) : null}
          </div>

          {snapshot.blind_spots.length > 0 ? (
            <div className="rounded-xl border border-warning/40 bg-warning-soft/40 p-3 sm:p-4">
              <h3 className="text-sm font-bold uppercase text-warning-foreground">Angles morts signalés</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm break-words">
                {snapshot.blind_spots.map((b, i) => (
                  <li key={`blind-${i}`} className="min-w-0 [overflow-wrap:anywhere] break-words">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
