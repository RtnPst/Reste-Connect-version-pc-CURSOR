import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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
        content: "Bientôt : croiser le fil avec un proche, mêmes questions, même lecture.",
      },
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
    toast.info("Le duel arrive bientôt — on prépare les défis entre proches.");
  };

  const joinDuel = () => {
    toast.info("Le duel arrive bientôt — on prépare les défis entre proches.");
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-4xl overflow-x-clip px-4 py-8 sm:px-6 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">Sur le fil</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Duel</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Bientôt : mêmes questions pour deux, puis comparer ce que chacun a capté. Idéal entre
            proches — grands-parents et petits-enfants compris.
          </p>
        </div>

        {/* Create */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">1. Choisis un angle</h2>
          <p className="text-sm text-muted-foreground">
            Le duel n’est pas encore ouvert. On prépare les défis entre proches.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAYABLE_THEME_KEYS.map((k) => (
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
        <section className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">Ou rejoins un fil partagé</h2>
          <p className="text-muted-foreground">
            Le duel n’est pas encore ouvert. On prépare les défis entre proches.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="flex-1 min-w-0 h-14 rounded-xl border border-border px-4 text-2xl font-mono font-bold tracking-widest text-center uppercase bg-background"
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
            <Trophy className="text-primary" /> Tes derniers duels
          </h2>
          <div className="rounded-xl border border-border/80 bg-card p-4 text-sm text-muted-foreground">
            L’historique apparaîtra dès que le duel sera ouvert.
          </div>
        </section>
      </main>
    </div>
  );
}
