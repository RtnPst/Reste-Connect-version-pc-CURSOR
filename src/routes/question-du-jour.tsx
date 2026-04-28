import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Home, Share2, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak } from "@/lib/speech";
import { THEMES, type ThemeKey } from "@/lib/themes";

type Q = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  explanation: string;
};

export const Route = createFileRoute("/question-du-jour")({
  head: () => ({
    meta: [
      { title: "Question du jour — Reste connecté !" },
      {
        name: "description",
        content: "Une nouvelle question chaque jour pour rester connecté avec les jeunes.",
      },
    ],
  }),
  component: DailyQuestionPage,
});

function DailyQuestionPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState<Q | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: daily } = await supabase
        .from("daily_questions")
        .select("question_id")
        .eq("active_date", today)
        .maybeSingle();

      let questionId = daily?.question_id;
      if (!questionId) {
        // Fallback: pick a random question
        const anyQ = await getPlayableQuestions({ limit: 1 });
        questionId = anyQ?.[0]?.id;
      }

      if (questionId) {
        const data = await getPlayableQuestions({ ids: [questionId], limit: 1 });
        if (data[0]) {
          const row = data[0];
          setQuestion({
            id: row.id,
            theme: row.theme,
            question: row.question,
            choices: row.choices,
            explanation: row.explanation,
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSelect = async (idx: number) => {
    if (selected !== null || !question) return;
    const result = await checkAnswer(question.id, idx);
    setSelected(idx);
    setRevealedCorrectIndex(result.correct_index);
    // No auto-speak — user clicks the speaker button if they want to hear the explanation
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        theme: question.theme,
        mode: "daily",
        score: result.correct ? 1 : 0,
        total_questions: 1,
        question_ids: [question.id],
        answers: [{ questionId: question.id, chosen: idx, correct: result.correct_index }],
      });
    }
  };

  const handleSpeakExplanation = () => {
    if (!question || selected === null) return;
    const ok = selected === revealedCorrectIndex;
    speak(`${ok ? "Bonne réponse !" : "Pas tout à fait."} ${question.explanation}`, true);
  };

  const handleShare = async () => {
    const url = window.location.origin;
    const shareData = {
      title: "Reste connecté !",
      text: "🌅 Je viens de jouer à la question du jour sur « Reste connecté ! » — un quiz pour rester branché sur la culture des jeunes. Essaie aussi !",
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      // user cancelled or share failed — fall through to clipboard
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text} ${url}`);
      toast.success("Lien copié ! Partagez-le à vos proches 💌");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p>Chargement…</p>
        </main>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p>Aucune question disponible aujourd'hui.</p>
          <Button asChild variant="outline">
            <Link to="/">Accueil</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === revealedCorrectIndex;
  const themeMeta = THEMES[question.theme];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-8 sm:py-12">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-soft text-accent-foreground text-sm font-bold">
            🌅 Question du jour —{" "}
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>

        <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-[var(--shadow-soft)] mb-6">
          <p className="text-sm font-bold mb-3" style={{ color: `var(--${themeMeta.colorVar})` }}>
            {themeMeta.emoji} {themeMeta.short}
          </p>
          <div className="flex items-start gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug flex-1">
              {question.question}
            </h1>
            <Button
              onClick={() =>
                speak(
                  `${question.question}. Choix : ${question.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
                  true,
                )
              }
              variant="ghost"
              size="icon"
              aria-label="Écouter"
            >
              <Volume2 />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 mb-6">
          {question.choices.map((choice, idx) => {
            const isSel = selected === idx;
            const isCorrectChoice = idx === revealedCorrectIndex;
            let cls =
              "border-2 border-border bg-card hover:border-primary hover:bg-primary-soft/30";
            let icon: React.ReactNode = null;
            if (isAnswered) {
              if (isCorrectChoice) {
                cls = "border-2 border-success bg-success-soft";
                icon = <CheckCircle2 className="size-6 text-success flex-shrink-0" />;
              } else if (isSel) {
                cls = "border-2 border-destructive bg-destructive/10";
                icon = <XCircle className="size-6 text-destructive flex-shrink-0" />;
              } else cls = "border-2 border-border bg-card opacity-60";
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={`text-left rounded-2xl p-4 sm:p-5 transition-all flex items-center gap-4 min-h-[64px] disabled:cursor-default ${cls}`}
              >
                <span
                  className={`flex-shrink-0 size-10 rounded-full flex items-center justify-center font-extrabold text-lg ${isAnswered && isCorrectChoice ? "bg-success text-success-foreground" : isAnswered && isSel ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}
                  aria-hidden
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-base sm:text-lg font-medium">{choice}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <>
            <div
              className={`rounded-2xl p-5 sm:p-6 mb-6 border-2 ${isCorrect ? "bg-success-soft border-success/30" : "bg-warning-soft border-warning/40"}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-lg mb-2">
                    {isCorrect ? "✅ Bravo !" : "💡 Voici l'explication :"}
                  </p>
                  <p className="text-base leading-relaxed">{question.explanation}</p>
                </div>
                <Button
                  onClick={handleSpeakExplanation}
                  variant="ghost"
                  size="icon"
                  aria-label="Écouter l'explication"
                  title="Écouter l'explication"
                  className="flex-shrink-0"
                >
                  <Volume2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={handleShare} variant="accent" size="lg">
                <Share2 />
                Partager
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/quiz">Faire un quiz complet</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/">
                  <Home />
                  Accueil
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
