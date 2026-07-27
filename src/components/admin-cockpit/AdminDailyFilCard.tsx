import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { parisCalendarDate } from "@/lib/paris-calendar";

type DayRow = {
  date: string;
  id: string | null;
  questionId: string | null;
  questionPreview: string | null;
  conceptKey: string | null;
};

type LiveOption = {
  id: string;
  question: string;
  concept_key: string | null;
  theme: string;
};

const HORIZON_DAYS = 21;

function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Admin card: fil du jour runway + assign / replace live questions on calendar dates.
 */
export function AdminDailyFilCard() {
  const today = useMemo(() => parisCalendarDate(), []);
  const horizonEnd = useMemo(() => addCalendarDays(today, HORIZON_DAYS - 1), [today]);

  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDate, setAssignDate] = useState(today);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LiveOption[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_questions")
      .select("id, active_date, question_id, questions(question, concept_key)")
      .gte("active_date", today)
      .lte("active_date", horizonEnd)
      .order("active_date", { ascending: true });

    if (error) {
      toast.error("Calendrier fil du jour indisponible");
      setLoading(false);
      return;
    }

    const byDate = new Map<string, DayRow>();
    for (const r of data ?? []) {
      const q = r.questions as { question?: string; concept_key?: string | null } | null;
      const date = String(r.active_date).slice(0, 10);
      byDate.set(date, {
        date,
        id: r.id,
        questionId: r.question_id,
        questionPreview: q?.question?.slice(0, 90) ?? null,
        conceptKey: q?.concept_key ?? null,
      });
    }

    const next: DayRow[] = [];
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const date = addCalendarDays(today, i);
      next.push(
        byDate.get(date) ?? {
          date,
          id: null,
          questionId: null,
          questionPreview: null,
          conceptKey: null,
        },
      );
    }
    setRows(next);
    setLoading(false);
  }, [horizonEnd, today]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let query = supabase
        .from("questions")
        .select("id, question, concept_key, theme")
        .eq("status", "live")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(40);

      const q = search.trim();
      if (q.length >= 2) {
        query = query.ilike("question", `%${q}%`);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setOptions([]);
        return;
      }
      setOptions(
        (data ?? []).map((row) => ({
          id: row.id,
          question: row.question,
          concept_key: row.concept_key,
          theme: row.theme,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  const scheduledCount = rows.filter((r) => r.questionId).length;
  const todayReady = rows[0]?.questionId != null;
  const lastDate = [...rows].reverse().find((r) => r.questionId)?.date ?? null;
  const gaps = rows.filter((r) => !r.questionId).map((r) => r.date);

  const saveAssignment = async () => {
    if (!selectedQuestionId || !assignDate || saving) return;
    setSaving(true);
    try {
      const existing = rows.find((r) => r.date === assignDate);
      if (existing?.id) {
        const { error } = await supabase
          .from("daily_questions")
          .update({ question_id: selectedQuestionId })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_questions").insert({
          active_date: assignDate,
          question_id: selectedQuestionId,
        });
        if (error) throw error;
      }
      toast.success(`Fil calé pour le ${assignDate}`);
      setSelectedQuestionId("");
      await loadCalendar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Enregistrement impossible";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const clearDay = async (row: DayRow) => {
    if (!row.id || saving) return;
    if (!window.confirm(`Retirer le fil du ${row.date} ?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("daily_questions").delete().eq("id", row.id);
      if (error) throw error;
      toast.success(`Jour ${row.date} libéré`);
      await loadCalendar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Suppression impossible";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden />
        Fil du jour
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Chargement du calendrier…</p>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="space-y-1.5 text-sm">
            <p>
              Aujourd’hui :{" "}
              <span className={todayReady ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                {todayReady ? "calé" : "manquant"}
              </span>
            </p>
            <p className="text-muted-foreground">
              {scheduledCount}/{HORIZON_DAYS} jours planifiés sur {HORIZON_DAYS} j
              {lastDate ? ` · dernier calé ${lastDate}` : ""}
            </p>
            {gaps.length > 0 ? (
              <p className="text-xs text-destructive">
                Trous : {gaps.slice(0, 5).join(", ")}
                {gaps.length > 5 ? ` (+${gaps.length - 5})` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun trou sur l’horizon.</p>
            )}
          </div>

          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-2 text-xs">
            {rows.map((row) => (
              <div
                key={row.date}
                className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setAssignDate(row.date);
                    if (row.questionId) setSelectedQuestionId(row.questionId);
                  }}
                >
                  <span className="font-semibold tabular-nums">{row.date}</span>
                  {row.date === today ? (
                    <span className="ml-1 text-[10px] font-bold uppercase text-primary">auj.</span>
                  ) : null}
                  <span className="mt-0.5 block truncate text-muted-foreground">
                    {row.questionPreview
                      ? `${row.conceptKey ? `[${row.conceptKey}] ` : ""}${row.questionPreview}`
                      : "— vide —"}
                  </span>
                </button>
                {row.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-semibold text-destructive underline-offset-2 hover:underline"
                    disabled={saving}
                    onClick={() => void clearDay(row)}
                  >
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border/60 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Assigner / remplacer
            </p>
            <label className="block space-y-1 text-xs" htmlFor="daily-assign-date">
              <span className="font-medium">Date (Paris)</span>
              <Input
                id="daily-assign-date"
                type="date"
                value={assignDate}
                min={today}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-xs" htmlFor="daily-q-search">
              <span className="font-medium">Chercher une question live</span>
              <Input
                id="daily-q-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mot-clé…"
              />
            </label>
            <label className="block space-y-1 text-xs" htmlFor="daily-q-pick">
              <span className="font-medium">Question</span>
              <select
                id="daily-q-pick"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {(o.concept_key ? `[${o.concept_key}] ` : "") + o.question.slice(0, 80)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!selectedQuestionId || !assignDate || saving}
              onClick={() => void saveAssignment()}
            >
              {saving ? "Enregistrement…" : "Enregistrer sur cette date"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
