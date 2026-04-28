import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Swords, Copy, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";

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
      { title: "Mode duel — Reste connecté !" },
      { name: "description", content: "Défiez un proche sur un quiz et comparez vos scores !" },
    ],
  }),
  component: DuelHomePage,
});

function DuelHomePage() {
  const { profile } = useAuth();
  const { user, loading } = useRequireAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [myDuels, setMyDuels] = useState<DuelListItem[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("duels")
        .select("*")
        .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      setMyDuels(data ?? []);
    })();
  }, [user]);

  const createDuel = async (theme: ThemeKey) => {
    if (!user) return;
    setCreating(true);
    try {
      // Pick 10 random question IDs for this theme
      const questions = await getPlayableQuestions({ theme, limit: QUESTION_COUNT });
      if (!questions || questions.length < QUESTION_COUNT) {
        toast.error("Pas assez de questions disponibles");
        setCreating(false);
        return;
      }
      const code = generateCode();

      const { data: duel, error } = await supabase
        .from("duels")
        .insert({
          code,
          creator_id: user.id,
          creator_name: profile?.display_name ?? "Joueur 1",
          theme,
          question_ids: questions.map((q) => q.id),
        })
        .select()
        .single();

      if (error || !duel) {
        toast.error("Impossible de créer le duel");
        setCreating(false);
        return;
      }

      navigate({ to: "/duel/$code", params: { code: duel.code } });
    } finally {
      setCreating(false);
    }
  };

  const joinDuel = () => {
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) return toast.error("Le code fait 6 caractères");
    navigate({ to: "/duel/$code", params: { code: c } });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 max-w-4xl py-8 space-y-8">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-soft text-warning-foreground font-bold">
            <Swords className="size-4" /> Nouveau !
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Mode duel</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lancez un défi à un proche : vous répondez aux mêmes questions, et vous comparez vos
            scores ensuite. Idéal entre grands-parents et petits-enfants !
          </p>
        </div>

        {/* Create */}
        <section className="rounded-3xl border-2 border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Choisissez un thème pour le défi</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {THEME_KEYS.map((k) => (
              <Button
                key={k}
                onClick={() => createDuel(k)}
                disabled={creating}
                variant="outline"
                size="xl"
                className="justify-start text-left h-auto py-4"
              >
                <span className="text-2xl mr-2">{THEMES[k].emoji}</span>
                <span className="flex flex-col items-start">
                  <span className="font-bold">{THEMES[k].short}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {THEMES[k].description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>

        {/* Join */}
        <section className="rounded-3xl border-2 border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold">Ou rejoignez un défi</h2>
          <p className="text-muted-foreground">
            Saisissez le code à 6 caractères que l'on vous a partagé.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="flex-1 min-w-0 h-14 rounded-xl border-2 border-border px-4 text-2xl font-mono font-bold tracking-widest text-center uppercase bg-background"
            />
            <Button onClick={joinDuel} size="xl" variant="accent">
              Rejoindre
            </Button>
          </div>
        </section>

        {/* History */}
        {myDuels.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="text-primary" /> Mes derniers duels
            </h2>
            <div className="space-y-2">
              {myDuels.map((d) => {
                const isCreator = d.creator_id === user?.id;
                const myScore = isCreator ? d.creator_score : d.opponent_score;
                const otherScore = isCreator ? d.opponent_score : d.creator_score;
                const otherName = isCreator ? d.opponent_name : d.creator_name;
                return (
                  <Link
                    key={d.id}
                    to="/duel/$code"
                    params={{ code: d.code }}
                    className="block rounded-xl border-2 border-border bg-card p-4 hover:border-primary transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {THEMES[d.theme as ThemeKey]?.emoji} {THEMES[d.theme as ThemeKey]?.short}
                          <span className="text-muted-foreground ml-2 text-sm">
                            vs {otherName ?? "en attente…"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{d.code}</p>
                      </div>
                      <div className="text-right text-sm">
                        {myScore !== null ? (
                          <span className="font-bold">
                            {myScore}/10 {otherScore !== null && <>vs {otherScore}/10</>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">À jouer</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
