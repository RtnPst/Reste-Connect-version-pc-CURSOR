import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, Share2, Trophy, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { speak, stopSpeaking } from "@/lib/speech";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { toDisplayChoices } from "@/lib/choice-order";

type Question = {
  id: string;
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
};

type DuelAnswer = {
  chosen: number;
  correct: number;
};

type Duel = {
  id: string;
  code: string;
  creator_id: string;
  creator_name: string;
  opponent_id: string | null;
  opponent_name: string | null;
  theme: ThemeKey;
  question_ids: string[];
  creator_score: number | null;
  creator_answers: DuelAnswer[] | null;
  opponent_score: number | null;
  opponent_answers: DuelAnswer[] | null;
};

export const Route = createFileRoute("/duel/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Duel ${params.code} — Reste connecté !` },
      { name: "description", content: "Rejoignez ce défi et comparez votre score !" },
    ],
  }),
  component: DuelPage,
});

function DuelPage() {
  const { code } = Route.useParams();
  const { profile } = useAuth();
  const { user, loading: authLoading } = useRequireAuth();

  const [duel, setDuel] = useState<Duel | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"intro" | "playing" | "done">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ chosen: number; correct: number }[]>([]);

  const audioEnabled = profile?.audio_enabled ?? true;

  // Load duel + questions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: d, error: dErr } = await supabase
        .from("duels")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (dErr || !d) {
        setError("Duel introuvable. Vérifiez le code.");
        setLoading(false);
        return;
      }

      const qs = await getPlayableQuestions({ ids: d.question_ids, limit: d.question_ids.length });
      if (!qs) {
        setError("Impossible de charger les questions.");
        setLoading(false);
        return;
      }

      // Order to match d.question_ids
      const ordered = d.question_ids
        .map((id: string) => qs.find((q) => q.id === id))
        .filter(Boolean) as Question[];

      setDuel(d as Duel);
      setQuestions(
        ordered.map((q) => ({
          ...q,
          ...toDisplayChoices(q.choices as unknown as string[]),
        })),
      );
      setLoading(false);

      // If user already played, jump to done
      const isCreator = d.creator_id === user.id;
      if (isCreator && d.creator_score !== null) setStep("done");
      else if (!isCreator && d.opponent_id === user.id && d.opponent_score !== null)
        setStep("done");
    })();
  }, [code, user]);

  const isCreator = duel?.creator_id === user?.id;
  const isParticipant = isCreator || duel?.opponent_id === user?.id;
  const myScore = isCreator ? duel?.creator_score : duel?.opponent_score;
  const otherScore = isCreator ? duel?.opponent_score : duel?.creator_score;
  const otherName = isCreator ? duel?.opponent_name : duel?.creator_name;

  const shareUrl = useMemo(
    () =>
      typeof window !== "undefined" ? `${window.location.origin}/duel/${code.toUpperCase()}` : "",
    [code],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const sharLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Défi quiz",
          text: `Je te défie sur ce quiz "${duel ? THEMES[duel.theme].label : ""}" !`,
          url: shareUrl,
        });
      } catch (error) {
        void error;
      }
    } else {
      copyLink();
    }
  };

  const start = async () => {
    if (!duel || !user) return;

    // Prevent invalid flow when duel already has another opponent.
    if (!isCreator && duel.opponent_id && duel.opponent_id !== user.id) {
      toast.error("Ce duel est deja complet.");
      setStep("intro");
      return;
    }

    // If user is not creator and no opponent set, claim the duel
    if (!isCreator && !duel.opponent_id) {
      const { error } = await supabase
        .from("duels")
        .update({ opponent_id: user.id, opponent_name: profile?.display_name ?? "Joueur 2" })
        .eq("id", duel.id);
      if (error) {
        toast.error("Impossible de rejoindre");
        return;
      }
      setDuel({
        ...duel,
        opponent_id: user.id,
        opponent_name: profile?.display_name ?? "Joueur 2",
      });
    }
    setStep("playing");
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealedCorrectIndex(null);
    setAnswers([]);
  };

  const currentQ = questions[currentIndex];

  const choose = async (i: number) => {
    if (selectedIndex !== null) return;
    const chosenOriginalIndex = currentQ.choiceOrder[i] ?? i;
    const result = await checkAnswer(currentQ.id, chosenOriginalIndex);
    setSelectedIndex(i);
    setRevealedCorrectIndex(result.correct_index);
    setAnswers((a) => [...a, { chosen: chosenOriginalIndex, correct: result.correct_index }]);
    stopSpeaking();
  };

  const next = async () => {
    stopSpeaking();
    if (currentIndex + 1 >= questions.length) {
      // Finish: save score
      const finalAnswers = answers;
      const score = finalAnswers.filter((a) => a.chosen === a.correct).length;
      if (!duel || !user) return;
      const update = isCreator
        ? { creator_score: score, creator_answers: finalAnswers }
        : { opponent_score: score, opponent_answers: finalAnswers };
      await supabase.from("duels").update(update).eq("id", duel.id);

      // Reload
      const { data: refreshed } = await supabase
        .from("duels")
        .select("*")
        .eq("id", duel.id)
        .maybeSingle();
      if (refreshed) setDuel(refreshed as Duel);
      setStep("done");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealedCorrectIndex(null);
    }
  };

  const playAudio = () => {
    if (currentQ) speak(currentQ.question);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 max-w-2xl py-12 text-center text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  if (error || !duel) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 max-w-2xl py-16 text-center">
          <h1 className="text-2xl font-bold mb-3">{error}</h1>
          <Button asChild variant="outline">
            <Link to="/duel">Retour aux duels</Link>
          </Button>
        </main>
      </div>
    );
  }

  // INTRO
  if (step === "intro") {
    const themeMeta = THEMES[duel.theme];
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
          <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8 text-center space-y-4">
            <span className="text-6xl">{themeMeta.emoji}</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Duel : {themeMeta.label}</h1>
            <p className="text-muted-foreground">10 questions — pas de chrono.</p>

            <div className="rounded-xl bg-muted p-4 text-left space-y-2">
              <p>
                👤 <strong>{duel.creator_name}</strong>{" "}
                {duel.creator_score !== null && (
                  <span className="text-success">— {duel.creator_score}/10 ✓</span>
                )}
              </p>
              <p>
                👤 <strong>{duel.opponent_name ?? "En attente d'un adversaire…"}</strong>{" "}
                {duel.opponent_score !== null && (
                  <span className="text-success">— {duel.opponent_score}/10 ✓</span>
                )}
              </p>
            </div>

            {isCreator && !duel.opponent_id && (
              <div className="space-y-3 pt-2">
                <p className="font-semibold">Partagez ce lien avec votre adversaire :</p>
                <div className="flex gap-2 flex-wrap">
                  <code className="flex-1 min-w-0 px-3 py-3 rounded-lg bg-muted text-sm font-mono truncate">
                    {shareUrl}
                  </code>
                  <Button onClick={copyLink} variant="outline" size="default">
                    <Copy />
                  </Button>
                  <Button onClick={sharLink} variant="accent" size="default">
                    <Share2 />
                  </Button>
                </div>
              </div>
            )}

            {isParticipant && myScore === null && myScore !== 0 && (
              <Button onClick={start} size="xl" variant="accent" className="w-full">
                C'est parti !
              </Button>
            )}

            {!isParticipant && (
              <Button onClick={start} size="xl" variant="accent" className="w-full">
                Rejoindre le défi
              </Button>
            )}

            {myScore !== null && (
              <Button
                onClick={() => setStep("done")}
                size="lg"
                variant="outline"
                className="w-full"
              >
                Voir les résultats
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // PLAYING
  if (step === "playing" && currentQ) {
    const showFeedback = selectedIndex !== null;
    const isCorrect =
      selectedIndex !== null &&
      (currentQ.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 max-w-2xl py-6 space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-muted-foreground">
              <span>
                Question {currentIndex + 1}/{questions.length}
              </span>
              <span>
                {THEMES[duel.theme].emoji} {THEMES[duel.theme].short}
              </span>
            </div>
            <Progress value={((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100} />
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <p className="text-xl sm:text-2xl font-bold flex-1">{currentQ.question}</p>
              {audioEnabled && (
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="icon"
                  aria-label="Lire la question"
                >
                  <Volume2 />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {currentQ.choices.map((c, i) => {
                const isThisCorrect = (currentQ.choiceOrder[i] ?? i) === revealedCorrectIndex;
                const isThisSelected = i === selectedIndex;
                let cls = "border-border hover:border-primary hover:bg-primary-soft/40";
                if (showFeedback) {
                  if (isThisCorrect) cls = "border-success bg-success-soft text-success-foreground";
                  else if (isThisSelected)
                    cls = "border-destructive bg-destructive/10 text-destructive";
                  else cls = "border-border opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={showFeedback}
                    className={`w-full text-left rounded-xl border-2 p-4 text-lg font-semibold transition ${cls}`}
                  >
                    <span className="inline-block size-7 rounded-full bg-muted text-muted-foreground text-sm font-bold leading-7 text-center mr-3">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {c}
                    {showFeedback && isThisCorrect && (
                      <CheckCircle2 className="inline ml-2 size-5" />
                    )}
                    {showFeedback && isThisSelected && !isThisCorrect && (
                      <XCircle className="inline ml-2 size-5" />
                    )}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className="rounded-xl bg-accent-soft p-4 space-y-3">
                <p className="font-bold">
                  {isCorrect ? "Bravo, c'est juste !" : "Pas tout à fait."}
                </p>
                <p className="text-base leading-relaxed">{currentQ.explanation}</p>
                <Button onClick={next} size="lg" variant="accent" className="w-full">
                  {currentIndex + 1 >= questions.length ? "Voir mon score" : "Question suivante"}{" "}
                  <ArrowRight />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // DONE
  const both = duel.creator_score !== null && duel.opponent_score !== null;
  const winner =
    both && duel.creator_score! > duel.opponent_score!
      ? duel.creator_name
      : both && duel.opponent_score! > duel.creator_score!
        ? duel.opponent_name
        : null;
  const tie = both && duel.creator_score === duel.opponent_score;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
        <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8 text-center space-y-5">
          <Trophy className="mx-auto size-16 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-extrabold">Résultat du duel</h1>

          <div className="grid sm:grid-cols-2 gap-4">
            <ScoreCard
              name={duel.creator_name}
              score={duel.creator_score}
              highlight={winner === duel.creator_name}
            />
            <ScoreCard
              name={duel.opponent_name ?? "En attente…"}
              score={duel.opponent_score}
              highlight={winner === duel.opponent_name}
            />
          </div>

          {both ? (
            <p className="text-xl font-bold">
              {tie ? "Égalité parfaite ! 🤝" : `${winner} l'emporte ! 🎉`}
            </p>
          ) : (
            <p className="text-muted-foreground">
              En attente que {otherName ?? "l'adversaire"} joue. Partagez à nouveau le lien si
              besoin.
            </p>
          )}

          {!both && isCreator && (
            <div className="flex gap-2 flex-wrap justify-center">
              <Button onClick={copyLink} variant="outline">
                <Copy /> Copier le lien
              </Button>
              <Button onClick={sharLink} variant="accent">
                <Share2 /> Partager
              </Button>
            </div>
          )}

          <div className="flex gap-3 flex-wrap justify-center pt-2">
            <Button asChild variant="outline">
              <Link to="/duel">Nouveau duel</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ScoreCard({
  name,
  score,
  highlight,
}: {
  name: string;
  score: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 ${highlight ? "border-success bg-success-soft" : "border-border bg-muted/30"}`}
    >
      <p className="text-sm font-semibold text-muted-foreground">{name}</p>
      <p className="text-4xl font-extrabold mt-1">{score === null ? "—" : `${score}/10`}</p>
    </div>
  );
}
