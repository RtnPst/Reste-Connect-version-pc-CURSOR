import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { THEMES, PLAYABLE_THEME_KEYS, type ThemeKey } from "@/lib/themes";

const QUESTION_COUNT = 10;

type DuelListItem = {
  id: string;
  code: string;
  creator_id: string;
  creator_name: string;
  opponent_name: string | null;
  creator_score: number | null;
  opponent_score: number | null;
  theme: ThemeKey;
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const Route = createFileRoute("/duel/")({
  head: () => ({
    meta: [
      { title: "Duel sur le fil — Tu captes ?" },
      {
        name: "description",
        content: "Mêmes questions pour deux, puis comparer ce que chacun a capté.",
      },
    ],
  }),
  component: DuelHomePage,
});

function DuelHomePage() {
  const { profile } = useAuth();
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [history, setHistory] = useState<DuelListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("duels")
        .select(
          "id, code, creator_id, creator_name, opponent_name, creator_score, opponent_score, theme",
        )
        .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setHistory([]);
        } else {
          setHistory((data as DuelListItem[]) ?? []);
        }
        setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const createDuel = async (theme: ThemeKey) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const qs = await getPlayableQuestions({ theme, limit: QUESTION_COUNT });
      if (!qs.length) {
        toast.error("Pas assez de questions sur cet angle pour un duel.");
        return;
      }
      const questionIds = qs.map((q) => q.id);
      let code = generateCode();
      let inserted: { code: string } | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase
          .from("duels")
          .insert({
            code,
            creator_id: user.id,
            creator_name: profile?.display_name ?? "Joueur 1",
            theme,
            question_ids: questionIds,
          })
          .select("code")
          .single();

        if (!error && data) {
          inserted = data;
          break;
        }
        // Unique code collision — retry
        if (error?.code === "23505") {
          code = generateCode();
          continue;
        }
        throw error;
      }

      if (!inserted) {
        toast.error("Impossible de créer le duel. Réessaie.");
        return;
      }

      toast.success("Duel créé — partage le code !");
      await navigate({ to: "/duel/$code", params: { code: inserted.code } });
    } catch (err) {
      console.error(err);
      toast.error("Création du duel impossible pour le moment.");
    } finally {
      setCreating(false);
    }
  };

  const joinDuel = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Le code fait 6 caractères.");
      return;
    }
    void navigate({ to: "/duel/$code", params: { code } });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto flex max-w-4xl items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">On prépare le duel…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-4xl overflow-x-clip px-4 py-8 sm:px-6 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">Sur le fil</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Duel</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mêmes questions pour deux — puis comparer ce que chacun a capté. Idéal entre proches.
          </p>
        </div>

        <section className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">1. Choisis un angle</h2>
          <p className="text-sm text-muted-foreground">
            {QUESTION_COUNT} questions tirées au sort — tu obtiens un code à partager.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAYABLE_THEME_KEYS.map((k) => (
              <Button
                key={k}
                onClick={() => void createDuel(k)}
                disabled={creating}
                variant="outline"
                size="xl"
                className="h-auto w-full min-w-0 justify-start whitespace-normal break-words px-4 py-4 text-left"
              >
                <span className="mr-2 shrink-0 text-2xl">{THEMES[k].emoji}</span>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="font-bold leading-tight">{THEMES[k].short}</span>
                  <span className="text-xs text-muted-foreground font-normal leading-relaxed">
                    {THEMES[k].description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">Ou rejoins un fil partagé</h2>
          <p className="text-muted-foreground">Entre le code à 6 caractères reçu d’un proche.</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="flex-1 min-w-0 h-14 rounded-xl border border-border px-4 text-2xl font-mono font-bold tracking-widest text-center uppercase bg-background"
              aria-label="Code du duel"
            />
            <Button onClick={joinDuel} size="xl" variant="accent" disabled={joinCode.trim().length !== 6}>
              Rejoindre
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-primary" /> Tes derniers duels
          </h2>
          {historyLoading ? (
            <div className="rounded-xl border border-border/80 bg-card p-4 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card p-4 text-sm text-muted-foreground">
              Pas encore de duel — crée-en un ou rejoins un code.
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((d) => {
                const themeLabel = THEMES[d.theme]?.short ?? d.theme;
                const vs = d.opponent_name ?? "en attente";
                const score =
                  d.creator_score != null && d.opponent_score != null
                    ? `${d.creator_score} — ${d.opponent_score}`
                    : d.creator_score != null || d.opponent_score != null
                      ? "En cours"
                      : "À jouer";
                return (
                  <li key={d.id}>
                    <Link
                      to="/duel/$code"
                      params={{ code: d.code }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm transition-colors hover:border-primary/35"
                    >
                      <span className="min-w-0">
                        <span className="font-mono font-bold tracking-wider">{d.code}</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {themeLabel} · {d.creator_name} vs {vs}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-primary/80">{score}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/play" className="font-medium text-primary/90 underline-offset-2 hover:underline">
            ← Retour au carrefour
          </Link>
        </p>
      </main>
    </div>
  );
}
