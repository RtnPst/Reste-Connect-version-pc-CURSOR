import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parisCalendarDate } from "@/lib/paris-calendar";

type DailyFilStatus = {
  todayReady: boolean;
  lastDate: string | null;
  scheduledFromToday: number;
  loading: boolean;
};

/**
 * Compact admin card: fil du jour runway (ops, not a full calendar editor).
 */
export function AdminDailyFilCard() {
  const [status, setStatus] = useState<DailyFilStatus>({
    todayReady: false,
    lastDate: null,
    scheduledFromToday: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = parisCalendarDate();
      const { data, error } = await supabase
        .from("daily_questions")
        .select("active_date")
        .gte("active_date", today)
        .order("active_date", { ascending: true });
      if (cancelled) return;
      if (error) {
        setStatus((s) => ({ ...s, loading: false }));
        return;
      }
      const dates = (data ?? []).map((r) => String(r.active_date).slice(0, 10));
      setStatus({
        todayReady: dates.includes(today),
        lastDate: dates.at(-1) ?? null,
        scheduledFromToday: dates.length,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden />
        Fil du jour
      </p>
      {status.loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Chargement du calendrier…</p>
      ) : (
        <div className="mt-3 space-y-1.5 text-sm">
          <p>
            Aujourd’hui :{" "}
            <span className={status.todayReady ? "font-semibold text-primary" : "font-semibold text-destructive"}>
              {status.todayReady ? "calé" : "manquant"}
            </span>
          </p>
          <p className="text-muted-foreground">
            {status.scheduledFromToday} jour{status.scheduledFromToday > 1 ? "s" : ""} planifié
            {status.scheduledFromToday > 1 ? "s" : ""} à partir d’aujourd’hui
            {status.lastDate ? ` · jusqu’au ${status.lastDate}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Ops : <code className="text-[11px]">npm run check:daily-calendar</code>
          </p>
        </div>
      )}
    </section>
  );
}
