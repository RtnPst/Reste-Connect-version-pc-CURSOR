import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Home, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ImmersiveQuizPlay } from "@/components/immersive-quiz/ImmersiveQuizPlay";
import { ConceptCaptureEcho } from "@/components/immersive-quiz/ConceptCaptureEcho";
import { ReturnToFilCard, RETURN_TO_FIL_HINT } from "@/components/ReturnToFilCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pickSessionCapturedConceptLabel } from "@/lib/concept-capture";
import { recordConceptSeen } from "@/lib/concept-memory";
import { DECADE_PACKS, isDecadeKey } from "@/lib/decade-packs";
import { toDisplayChoices } from "@/lib/choice-order";
import { parisCalendarDate } from "@/lib/paris-calendar";
import { getPlayableQuestionsByConcepts } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { shareCapturedConcept, sharePayload } from "@/lib/share";
import { playCorrect, playWrong, playFanfare, stopMusic } from "@/lib/sfx";
import { speak, stopSpeaking } from "@/lib/speech";
import type { ThemeKey } from "@/lib/themes";

type Question = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
  conceptKey: string | null;
};

const QUESTION_COUNT = 10;

export const Route = createFileRoute("/quiz/epoque/$decade")({
  beforeLoad: ({ params }) => {
    if (!isDecadeKey(params.decade)) {
      throw redirect({ to: "/quiz/epoque/", replace: true });
    }
  },
  head: ({ params }) => {
    const pack = isDecadeKey(params.decade) ? DECADE_PACKS[params.decade] : null;
    return {
      meta: [
        { title: `${pack?.label ?? "Époque"} — Tu captes ?` },
        { name: "description", content: pack?.description ?? "Expressions d’une époque." },
      ],
    };
  },
  component: EpoqueQuizPage,
});

function EpoqueQuizPage() {
  const { decade } = Route.useParams();
  const pack = DECADE_PACKS[decade as keyof typeof DECADE_PACKS];
  const { user, profile, refreshProfile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ chosen: number; correct: number }[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinished(false);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealedCorrectIndex(null);
    setAnswers([]);
    setScore(0);
    setXpGained(null);
    try {
      const qs = await getPlayableQuestionsByConcepts(pack.conceptKeys, QUESTION_COUNT);
      if (qs.length < 4) {
        setError("Pas assez de questions pour cette époque encore — reviens bientôt.");
        setQuestions([]);
        return;
      }
      setQuestions(
        qs.map((q) => ({
          id: q.id,
          theme: q.theme,
          question: q.question,
          explanation: q.explanation,
          conceptKey: q.conceptKey,
          ...toDisplayChoices(q.choices),
        })),
      );
    } catch (e) {
      console.error(e);
      setError("Impossible de charger cette époque.");
    } finally {
      setLoading(false);
    }
  }, [pack.conceptKeys]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = questions[currentIndex];

  const handleSelect = useCallback(
    async (displayIdx: number) => {
      if (!current || selectedIndex !== null) return;
      const chosenOriginal = current.choiceOrder[displayIdx] ?? displayIdx;
      try {
        const result = await checkAnswer(current.id, chosenOriginal);
        setSelectedIndex(displayIdx);
        setRevealedCorrectIndex(result.correct_index);
        setAnswers((a) => [...a, { chosen: chosenOriginal, correct: result.correct_index }]);
        if (result.is_correct) {
          setScore((s) => s + 1);
          playCorrect(profile?.sfx_enabled ?? true);
          if (user && current.conceptKey) {
            void recordConceptSeen(user.id, current.conceptKey);
          }
        } else {
          playWrong(profile?.sfx_enabled ?? true);
        }
        stopSpeaking();
      } catch {
        toast.error("Impossible de vérifier la réponse");
      }
    },
    [current, selectedIndex, profile?.sfx_enabled, user],
  );

  const handleNext = useCallback(async () => {
    stopSpeaking();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealedCorrectIndex(null);
      return;
    }
    setFinished(true);
    playFanfare(profile?.sfx_enabled ?? true);
    stopMusic();
    if (!user) return;
    const theme = questions[0]?.theme ?? "vocabulaire";
    const { error: saveErr } = await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      mode: "theme",
      theme,
      score,
      total_questions: questions.length,
      question_ids: questions.map((q) => q.id),
      answers,
    });
    if (saveErr) {
      toast.error("Impossible d’enregistrer ce passage.");
      return;
    }
    const today = parisCalendarDate();
    const { data: prof } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_play_date, total_xp")
      .eq("id", user.id)
      .maybeSingle();
    if (prof) {
      const last = prof.last_play_date;
      let newStreak = prof.current_streak;
      if (last !== today) {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yesterday = parisCalendarDate(y);
        newStreak = last === yesterday ? newStreak + 1 : 1;
      }
      const gained = score * 10;
      setXpGained(gained);
      await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, prof.longest_streak),
          last_play_date: today,
          total_xp: prof.total_xp + gained,
        })
        .eq("id", user.id);
      await refreshProfile();
    }
  }, [currentIndex, questions, score, answers, user, profile?.sfx_enabled, refreshProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="flex items-center justify-center px-4 py-20">
          <p className="text-muted-foreground">On ouvre l’époque…</p>
        </main>
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto max-w-lg space-y-4 px-4 py-10 text-center">
          <p>{error ?? "Aucune question."}</p>
          <Button asChild>
            <Link to="/quiz/epoque/">Autres époques</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (finished) {
    const sessionCapturedLabel = pickSessionCapturedConceptLabel(questions, answers);
    const handleShare = async () => {
      const result = sessionCapturedLabel
        ? await shareCapturedConcept(sessionCapturedLabel)
        : await sharePayload({
            title: "Tu captes ?",
            text: `J’ai revisité « ${pack.label} » sur Tu captes ?.`,
          });
      if (result === "copied") toast.success("Copié dans le presse-papiers");
    };

    return (
      <div className="flex min-h-[100dvh] flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <header className="flex min-h-[3rem] items-center gap-2 border-b border-border/70 px-2 py-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <Home className="size-4" />
            </Link>
          </Button>
          <span className="flex-1 truncate text-center text-xs font-semibold text-muted-foreground">
            {pack.label}
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/quiz/epoque/">Époques</Link>
          </Button>
        </header>
        <main className="container mx-auto max-w-3xl flex-1 px-4 py-8">
          <div className="quiz-result-card mb-6 rounded-3xl border border-border/80 bg-card p-6 text-center sm:p-10">
            <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">{pack.short}</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Époque parcourue</h1>
            {sessionCapturedLabel ? <ConceptCaptureEcho label={sessionCapturedLabel} /> : null}
            <p className="mt-4 text-sm text-muted-foreground">
              {score} / {questions.length} lectures captées
              {xpGained !== null ? ` · +${xpGained} XP` : null}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button onClick={() => void handleShare()} variant="outline" size="lg">
              <Share2 /> Partager
            </Button>
            <Button onClick={() => void load()} variant="secondary" size="lg">
              <RotateCcw /> Rejouer cette époque
            </Button>
            <Button asChild size="lg">
              <Link to="/play">
                Carrefour <ArrowRight />
              </Link>
            </Button>
            <ReturnToFilCard hint={RETURN_TO_FIL_HINT.theme} className="mt-2" />
          </div>
        </main>
      </div>
    );
  }

  const isAnswered = selectedIndex !== null;
  const isCorrect =
    isAnswered &&
    selectedIndex !== null &&
    (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;

  return (
    <ImmersiveQuizPlay
      quitHref="/quiz/epoque/"
      quitAriaLabel="Retour aux époques"
      headerCenter={
        <span className="truncate font-extrabold">
          {pack.short} · {pack.label}
        </span>
      }
      streak={0}
      streakTitle={pack.description}
      progressPercent={((currentIndex + (selectedIndex !== null ? 1 : 0)) / questions.length) * 100}
      stepFraction={`${currentIndex + 1}/${questions.length}`}
      flowStepKey={current.id}
      questionText={current.question}
      choices={current.choices}
      selectedIndex={selectedIndex}
      revealedCorrectIndex={revealedCorrectIndex}
      choiceOrder={current.choiceOrder}
      onSelectChoice={(idx) => void handleSelect(idx)}
      onSpeakQuestion={() => {
        speak(
          `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
          true,
        );
      }}
      isCorrect={isCorrect}
      explanation={current.explanation}
      onSpeakExplanation={() => {
        speak(`${isCorrect ? "Bien vu." : "Voici pourquoi ça colle."} ${current.explanation}`, true);
      }}
      onPrimaryNext={() => void handleNext()}
      primaryNextLabel={currentIndex + 1 < questions.length ? "Continuer" : "Voir la suite"}
      conceptCapture={
        isCorrect ? { conceptKey: current.conceptKey, explanation: current.explanation } : undefined
      }
    />
  );
}
