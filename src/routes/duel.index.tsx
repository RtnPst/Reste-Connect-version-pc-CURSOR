import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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
      { title: "Mode duel — Tu captes ?" },
      { name: "description", content: "Défie un proche sur un quiz et compare les scores !" },
    ],
  }),
  component: DuelHomePage,
});

function DuelHomePage() {
  useAuth();
  useRequireAuth();
  const navigate = useNavigate();
  const [creating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const createDuel = async (theme: ThemeKey) => {
    void theme;
    toast.info("Le mode Duel arrive bientôt. On prépare les défis entre proches.");
  };

  const joinDuel = () => {
    toast.info("Le mode Duel arrive bientôt. On prépare les défis entre proches.");
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-4xl overflow-x-clip px-4 py-8 sm:px-6 space-y-8">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-soft text-warning-foreground font-bold">
            <Swords className="size-4" /> Nouveau !
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Mode duel</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lance un défi : mêmes questions pour tout le monde (bientôt dispo), puis comparaison
            des scores. Idéal entre grands-parents et petits-enfants !
          </p>
        </div>

        {/* Create */}
        <section className="rounded-3xl border-2 border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Choisis un thème pour le défi</h2>
          <p className="text-sm text-muted-foreground">
            Le mode Duel arrive bientôt. On prépare les défis entre proches.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_KEYS.map((k) => (
              <Button
                key={k}
                onClick={() => createDuel(k)}
                disabled
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

        {/* Join */}
        <section className="rounded-3xl border-2 border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold">Ou rejoignez un défi</h2>
          <p className="text-muted-foreground">
            Le mode Duel arrive bientôt. On prépare les défis entre proches.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="flex-1 min-w-0 h-14 rounded-xl border-2 border-border px-4 text-2xl font-mono font-bold tracking-widest text-center uppercase bg-background"
              disabled
            />
            <Button onClick={joinDuel} size="xl" variant="accent" disabled>
              Rejoindre
            </Button>
          </div>
        </section>

        {/* History */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-primary" /> Mes derniers duels
          </h2>
          <div className="rounded-xl border-2 border-border bg-card p-4 text-sm text-muted-foreground">
            L'historique des duels sera disponible dès l'activation du mode.
          </div>
        </section>
      </main>
    </div>
  );
}
