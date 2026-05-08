import { useMemo, useState } from "react";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { CockpitStatusBadge } from "@/components/admin-cockpit/CockpitStatusBadge";
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
import type { AdminCockpitQuestionDrafts, QuestionDraftRow } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  snapshot: AdminCockpitQuestionDrafts;
  loading: boolean;
  fetchWarning: string | null;
};

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function decisionTone(d: string): "success" | "danger" | "warning" | "neutral" {
  const x = d.toLowerCase();
  if (x === "approve") return "success";
  if (x === "reject") return "danger";
  if (x === "watchlist") return "warning";
  return "neutral";
}

function choicesFor(row: QuestionDraftRow): string[] {
  return [row.choice_1, row.choice_2, row.choice_3, row.choice_4];
}

function DraftCard({ row }: { row: QuestionDraftRow }) {
  const choices = choicesFor(row);
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 md:hidden">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <CockpitStatusBadge tone="muted">{row.suggested_theme || "—"}</CockpitStatusBadge>
        <CockpitStatusBadge tone="neutral">{row.difficulty || "—"}</CockpitStatusBadge>
        <CockpitStatusBadge tone={decisionTone(row.human_decision)}>
          Décision: {row.human_decision?.trim() ? row.human_decision : "—"}
        </CockpitStatusBadge>
        <CockpitStatusBadge tone="muted" className="font-mono text-[10px]">
          {row.concept_key}
        </CockpitStatusBadge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Type: {row.question_type || "—"}</p>
      <h3 className="mt-1 break-words text-base font-bold">{row.question}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        {choices.map((c, i) => (
          <li
            key={`c-${i}`}
            className={
              i === row.correct_index ? "font-semibold text-foreground" : "break-words"
            }
          >
            {c}
            {i === row.correct_index ? " ✓" : ""}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground break-words">{row.explanation}</p>
      <details className="mt-3 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-sm">
        <summary className="min-h-10 cursor-pointer list-none py-1 font-semibold text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          Risques / doublons / notes
        </summary>
        <dl className="mt-2 space-y-2 text-xs">
          <div>
            <dt className="font-bold text-foreground/80">Ton & risque</dt>
            <dd className="whitespace-pre-wrap break-words text-muted-foreground">
              {row.tone_risk_notes?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground/80">Doublons</dt>
            <dd className="whitespace-pre-wrap break-words text-muted-foreground">
              {row.duplicate_collision_notes?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground/80">Notes humaines</dt>
            <dd className="whitespace-pre-wrap break-words text-muted-foreground">
              {row.human_notes?.trim() || "—"}
            </dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

export function QuestionDraftsTab({ snapshot, loading, fetchWarning }: Props) {
  const [conceptKey, setConceptKey] = useState<string>("all");
  const [theme, setTheme] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [humanDecision, setHumanDecision] = useState<string>("all");
  const [q, setQ] = useState("");

  const conceptKeys = useMemo(
    () => uniqSorted(snapshot.rows.map((r) => r.concept_key)),
    [snapshot.rows],
  );
  const themes = useMemo(
    () => uniqSorted(snapshot.rows.map((r) => r.suggested_theme)),
    [snapshot.rows],
  );
  const difficulties = useMemo(
    () => uniqSorted(snapshot.rows.map((r) => r.difficulty)),
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return snapshot.rows.filter((row) => {
      if (conceptKey !== "all" && row.concept_key !== conceptKey) return false;
      if (theme !== "all" && row.suggested_theme !== theme) return false;
      if (difficulty !== "all" && row.difficulty !== difficulty) return false;
      if (humanDecision !== "all") {
        const rowD = row.human_decision.trim();
        if (humanDecision === "__empty__") {
          if (rowD !== "") return false;
        } else if (row.human_decision !== humanDecision) return false;
      }
      if (needle && !row.question.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [snapshot.rows, conceptKey, theme, difficulty, humanDecision, q]);

  const kpis = useMemo(() => {
    const total = snapshot.stats.total_rows ?? snapshot.rows.length;
    const pending =
      snapshot.stats.pending_review_rows ??
      snapshot.rows.filter((r) => !r.human_decision.trim()).length;
    const concepts = new Set(snapshot.rows.map((r) => r.concept_key).filter(Boolean)).size;
    return { total, pending, concepts };
  }, [snapshot.rows, snapshot.stats]);

  const warnings = fetchWarning ? [{ code: fetchWarning }] : [];

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere] sm:text-3xl">Admin AI Cockpit — Question drafts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot: {snapshot.generated_at || "non disponible"}
        </p>
      </div>

      <ReadOnlyBanner />
      <WarningList title="Avertissements snapshot" warnings={warnings} />

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
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Brouillons (total)" value={String(kpis.total)} />
            <KpiCard label="À revoir (humain)" value={String(kpis.pending)} />
            <KpiCard label="Concepts distincts" value={String(kpis.concepts)} />
          </div>

          <div className="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-card/60 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4">
            <div className="min-w-0">
              <Label htmlFor="qd-concept">Concept key</Label>
              <Select value={conceptKey} onValueChange={setConceptKey}>
                <SelectTrigger id="qd-concept" className="mt-1 h-auto min-h-10 w-full min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {conceptKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="qd-theme">Thème suggéré</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="qd-theme" className="mt-1 h-auto min-h-10 w-full min-w-0 sm:min-h-9">
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
              <Label htmlFor="qd-diff">Difficulté</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="qd-diff" className="mt-1 h-auto min-h-10 w-full min-w-0 sm:min-h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="qd-decision">Décision humaine</Label>
              <Select value={humanDecision} onValueChange={setHumanDecision}>
                <SelectTrigger id="qd-decision" className="mt-1 h-auto min-h-10 w-full min-w-0 sm:min-h-9">
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
            <div className="min-w-0 sm:col-span-2">
              <Label htmlFor="qd-q">Recherche (texte question)</Label>
              <Input
                id="qd-q"
                className="mt-1 min-h-10 min-w-0 sm:min-h-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mot-clé dans l’intitulé…"
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
                setConceptKey("all");
                setTheme("all");
                setDifficulty("all");
                setHumanDecision("all");
                setQ("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length} / {snapshot.rows.length} brouillon(s) affiché(s)
          </p>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground">
              Aucun brouillon ne correspond aux filtres.
            </p>
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <div className="touch-pan-x overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Concept</th>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Thème</th>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Diff.</th>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Décision</th>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Question & choix</th>
                        <th className="px-2 py-2.5 font-bold sm:px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => {
                        const choices = choicesFor(row);
                        return (
                          <tr
                            key={`${row.concept_key}-${row.question_type}-${idx}`}
                            className="border-b border-border/50 align-top"
                          >
                            <td className="max-w-[100px] min-w-0 px-2 py-2.5 font-mono text-xs break-all sm:px-3">
                              {row.concept_key}
                            </td>
                            <td className="min-w-0 px-2 py-2.5 text-xs break-words sm:px-3">{row.suggested_theme}</td>
                            <td className="min-w-0 px-2 py-2.5 whitespace-nowrap sm:px-3">{row.difficulty}</td>
                            <td className="min-w-0 px-2 py-2.5 sm:px-3">
                              <CockpitStatusBadge tone={decisionTone(row.human_decision)}>
                                {row.human_decision?.trim() || "—"}
                              </CockpitStatusBadge>
                            </td>
                            <td className="max-w-[320px] min-w-0 px-2 py-2.5 sm:px-3">
                              <p className="font-semibold break-words">{row.question}</p>
                              <ol className="mt-1 list-decimal pl-4 text-xs text-muted-foreground">
                                {choices.map((c, i) => (
                                  <li
                                    key={i}
                                    className={
                                      i === row.correct_index ? "font-semibold text-foreground" : "break-words"
                                    }
                                  >
                                    {c}
                                    {i === row.correct_index ? " ✓" : ""}
                                  </li>
                                ))}
                              </ol>
                            </td>
                            <td className="max-w-[240px] min-w-0 px-2 py-2.5 sm:px-3">
                              <details>
                                <summary className="min-h-9 cursor-pointer list-none text-xs font-semibold text-primary outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                                  Voir
                                </summary>
                                <div className="mt-1 max-h-48 space-y-2 overflow-y-auto text-xs break-words">
                                  <p>
                                    <span className="font-bold text-foreground/80">Risque: </span>
                                    <span className="text-muted-foreground whitespace-pre-wrap">
                                      {row.tone_risk_notes?.trim() || "—"}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="font-bold text-foreground/80">Doublons: </span>
                                    <span className="text-muted-foreground whitespace-pre-wrap">
                                      {row.duplicate_collision_notes?.trim() || "—"}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="font-bold text-foreground/80">Notes: </span>
                                    <span className="text-muted-foreground whitespace-pre-wrap">
                                      {row.human_notes?.trim() || "—"}
                                    </span>
                                  </p>
                                </div>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="min-w-0 space-y-3 md:hidden">
                {filtered.map((row, idx) => (
                  <DraftCard key={`${row.concept_key}-${row.question_type}-m-${idx}`} row={row} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
