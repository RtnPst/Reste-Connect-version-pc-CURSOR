import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Home, RotateCcw, Share2, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare, startMusic, stopMusic } from "@/lib/sfx";
import { Confetti } from "@/components/Confetti";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { displayIndexFromOriginal, toDisplayChoices } from "@/lib/choice-order";

type Question = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
};

const QUESTION_COUNT = 10;

export const Route = createFileRoute("/quiz/$theme")({
  head: ({ params }) => {
    const t = THEMES[params.theme as ThemeKey];
    return {
      meta: [
        { title: `Quiz ${t?.label ?? ""} — Reste connecté !` },
        { name: "description", content: `Testez vos connaissances : ${t?.description ?? ""}` },
      ],
    };
  },
  component: QuizPage,
});

function QuizPage() {
  const { theme } = Route.useParams();
  const themeKey = theme as ThemeKey;
  const themeMeta = THEMES[themeKey];
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; chosen: number; correct: number }[]>(
    [],
  );
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // audioEnabled preference is used implicitly: the speak() call only fires on explicit click

  // Load questions
  useEffect(() => {
    if (!themeMeta) {
      setError("Thème inconnu.");
      setLoading(false);
      return;
    }
    (async () => {
      const data = await getPlayableQuestions({ theme: themeKey, limit: QUESTION_COUNT });
      if (!data.length) {
        setError("Impossible de charger les questions.");
        setLoading(false);
        return;
      }

      setQuestions(
        data.map((q) => {
          const shuffled = toDisplayChoices(q.choices);
          return {
            ...q,
            choices: shuffled.choices,
            choiceOrder: shuffled.choiceOrder,
          };
        }),
      );
      setLoading(false);
    })();

    return () => stopSpeaking();
  }, [themeKey, themeMeta]);

  // Ambient music while playing
  useEffect(() => {
    if (profile?.music_enabled && !loading && !finished) startMusic();
    return () => stopMusic();
  }, [profile?.music_enabled, loading, finished]);

  const current = questions[currentIndex];
  const progress = useMemo(
    () =>
      questions.length
        ? ((currentIndex + (selectedIndex !== null ? 1 : 0)) / questions.length) * 100
        : 0,
    [currentIndex, selectedIndex, questions.length],
  );

  const handleSelect = useCallback(
    async (index: number) => {
      if (selectedIndex !== null || !current) return;
      try {
        const chosenOriginalIndex = current.choiceOrder[index] ?? index;
        const result = await checkAnswer(current.id, chosenOriginalIndex);
        setSelectedIndex(index);
        setRevealedCorrectIndex(result.correct_index);
        setAnswers((prev) => [
          ...prev,
          { questionId: current.id, chosen: chosenOriginalIndex, correct: result.correct_index },
        ]);
        if (result.correct) setScore((prev) => prev + 1);
        const sfxOn = profile?.sfx_enabled ?? true;
        if (result.correct) playCorrect(sfxOn);
        else playWrong(sfxOn);
      } catch {
        toast.error("Impossible de verifier la reponse");
      }
    },
    [selectedIndex, current, profile?.sfx_enabled],
  );

  const handleSpeakExplanation = () => {
    if (!current || selectedIndex === null || !profile?.audio_enabled) return;
    const isCorrect = selectedIndex === revealedCorrectIndex;
    speak(`${isCorrect ? "Bonne réponse !" : "Pas tout à fait."} ${current.explanation}`, true);
  };

  const handleNext = useCallback(async () => {
    stopSpeaking();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealedCorrectIndex(null);
    } else {
      // Finish & save
      setFinished(true);
      playFanfare(profile?.sfx_enabled ?? true);
      stopMusic();
      if (user) await saveAttempt(user.id, score, questions, answers, refreshProfile);
    }
  }, [currentIndex, profile?.sfx_enabled, user, score, questions, answers, refreshProfile]);

  const handleSpeakQuestion = () => {
    if (!current || !profile?.audio_enabled) return;
    const text = `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`;
    speak(text, true);
  };

  useEffect(() => {
    if (!profile?.audio_enabled || !current || selectedIndex !== null) return;
    const id = window.setTimeout(() => {
      const text = `${current.question}. Choix : ${current.choices
        .map((c, i) => `${i + 1}, ${c}`)
        .join(". ")}`;
      speak(text, true);
    }, 250);
    return () => window.clearTimeout(id);
  }, [profile?.audio_enabled, current, selectedIndex, revealedCorrectIndex]);

  useEffect(() => {
    if (!profile?.audio_enabled || !current || selectedIndex === null) return;
    const isCorrect = selectedIndex === revealedCorrectIndex;
    const id = window.setTimeout(() => {
      speak(`${isCorrect ? "Bonne réponse !" : "Pas tout à fait."} ${current.explanation}`, true);
    }, 250);
    return () => window.clearTimeout(id);
  }, [profile?.audio_enabled, current, selectedIndex, revealedCorrectIndex]);

  useEffect(() => {
    if (!current || finished) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (selectedIndex === null) {
        const selectedWithKeyboard = Number(event.key) - 1;
        if (selectedWithKeyboard >= 0 && selectedWithKeyboard < current.choices.length) {
          event.preventDefault();
          handleSelect(selectedWithKeyboard);
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, selectedIndex, finished, handleNext, handleSelect]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Chargement du quiz…</p>
        </main>
      </div>
    );
  }

  if (error || !themeMeta) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-lg text-destructive">{error ?? "Thème introuvable."}</p>
          <Button asChild variant="outline">
            <Link to="/quiz">Retour aux thèmes</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (finished) {
    return (
      <ResultsScreen
        score={score}
        total={questions.length}
        questions={questions}
        answers={answers}
        themeKey={themeKey}
        isLoggedIn={!!user}
        onReplay={() => {
          setQuestions([]);
          setCurrentIndex(0);
          setSelectedIndex(null);
          setRevealedCorrectIndex(null);
          setAnswers([]);
          setScore(0);
          setFinished(false);
          setLoading(true);
          // re-trigger effect
          setTimeout(() => navigate({ to: "/quiz/$theme", params: { theme: themeKey } }), 50);
        }}
      />
    );
  }

  if (!current) return null;

  const isAnswered = selectedIndex !== null;
  const isCorrect =
    isAnswered &&
    selectedIndex !== null &&
    (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-6 sm:py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span aria-hidden>{themeMeta.emoji}</span> {themeMeta.short}
            </span>
            <span className="text-sm sm:text-base font-bold text-muted-foreground">
              Question {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Question */}
        <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-[var(--shadow-soft)] mb-6">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug flex-1">
              {current.question}
            </h1>
            <Button
              onClick={handleSpeakQuestion}
              variant="ghost"
              size="icon"
              aria-label="Écouter la question"
              title={
                profile?.audio_enabled
                  ? "Écouter la question"
                  : "Activez la lecture vocale dans Réglages"
              }
              className="flex-shrink-0"
              disabled={!profile?.audio_enabled}
            >
              <Volume2 />
            </Button>
          </div>
        </div>

        {/* Choices */}
        <div className="grid gap-3 mb-6">
          {current.choices.map((choice, idx) => {
            const isSelected = selectedIndex === idx;
            const isCorrectChoice = (current.choiceOrder[idx] ?? idx) === revealedCorrectIndex;

            let className =
              "border-2 border-border bg-card hover:border-primary hover:bg-primary-soft/30";
            let icon: React.ReactNode = null;

            if (isAnswered) {
              if (isCorrectChoice) {
                className = "border-2 border-success bg-success-soft text-foreground";
                icon = <CheckCircle2 className="size-6 text-success flex-shrink-0" />;
              } else if (isSelected) {
                className = "border-2 border-destructive bg-destructive/10 text-foreground";
                icon = <XCircle className="size-6 text-destructive flex-shrink-0" />;
              } else {
                className = "border-2 border-border bg-card opacity-60";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={`text-left rounded-2xl p-4 sm:p-5 transition-all flex items-center gap-4 min-h-[64px] disabled:cursor-default ${className}`}
              >
                <span
                  className={`flex-shrink-0 size-10 rounded-full flex items-center justify-center font-extrabold text-lg ${
                    isAnswered && isCorrectChoice
                      ? "bg-success text-success-foreground"
                      : isAnswered && isSelected
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-secondary text-secondary-foreground"
                  }`}
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

        {/* Explanation */}
        {isAnswered && (
          <div
            className={`rounded-2xl p-5 sm:p-6 mb-6 border-2 ${
              isCorrect ? "bg-success-soft border-success/30" : "bg-warning-soft border-warning/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-extrabold text-lg mb-2">
                  {isCorrect ? "✅ Bonne réponse !" : "💡 Pas tout à fait — voici l'explication :"}
                </p>
                <p className="text-base leading-relaxed">{current.explanation}</p>
              </div>
              <Button
                onClick={handleSpeakExplanation}
                variant="ghost"
                size="icon"
                aria-label="Écouter l'explication"
                title={
                  profile?.audio_enabled
                    ? "Écouter l'explication"
                    : "Activez la lecture vocale dans Réglages"
                }
                className="flex-shrink-0"
                disabled={!profile?.audio_enabled}
              >
                <Volume2 />
              </Button>
            </div>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <Button onClick={handleNext} size="xl" variant="accent" className="w-full">
            {currentIndex + 1 < questions.length ? "Question suivante" : "Voir mon score"}
            <ArrowRight />
          </Button>
        )}

        {!isAnswered && (
          <div className="text-center">
            <Link
              to="/quiz"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Changer de thème
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

async function saveAttempt(
  userId: string,
  score: number,
  questions: Question[],
  answers: { questionId: string; chosen: number; correct: number }[],
  refreshProfile: () => Promise<void>,
) {
  try {
    await supabase.from("quiz_attempts").insert({
      user_id: userId,
      theme: questions[0]?.theme ?? null,
      mode: "theme",
      score,
      total_questions: questions.length,
      question_ids: questions.map((q) => q.id),
      answers: answers,
    });

    // Update streak + XP
    const today = new Date().toISOString().slice(0, 10);
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_play_date, total_xp")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      const last = profile.last_play_date;
      let newStreak = profile.current_streak;
      if (last !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = last === yesterday ? newStreak + 1 : 1;
      }
      const xpGain = score * 10;
      await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, profile.longest_streak),
          last_play_date: today,
          total_xp: profile.total_xp + xpGain,
        })
        .eq("id", userId);
    }
    await refreshProfile();
  } catch (err) {
    console.error("Save attempt failed", err);
  }
}

function ResultsScreen({
  score,
  total,
  questions,
  answers,
  themeKey,
  isLoggedIn,
  onReplay,
}: {
  score: number;
  total: number;
  questions: Question[];
  answers: { questionId: string; chosen: number; correct: number }[];
  themeKey: ThemeKey;
  isLoggedIn: boolean;
  onReplay: () => void;
}) {
  const themeMeta = THEMES[themeKey];
  const percentage = Math.round((score / total) * 100);
  const message =
    percentage === 100
      ? "Parfait ! Vous êtes incollable !"
      : percentage >= 70
        ? "Excellent travail !"
        : percentage >= 40
          ? "Pas mal, vous progressez !"
          : "Continuez, ça va venir !";

  const wrong = answers
    .map((a, i) => ({ a, q: questions[i] }))
    .filter(({ a }) => a.chosen !== a.correct);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Confetti active={percentage >= 70} />
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-8 sm:py-12">
        <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-10 shadow-[var(--shadow-card)] text-center mb-6 animate-scale-in">
          <div className="text-6xl sm:text-7xl mb-3">
            {percentage >= 70 ? "🎉" : percentage >= 40 ? "👍" : "💪"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{message}</h1>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-6">
            Votre score :{" "}
            <span className="font-extrabold text-primary">
              {score} / {total}
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2 max-w-lg mx-auto mb-3">
            <Button onClick={onReplay} size="lg" variant="accent">
              <RotateCcw />
              Rejouer
            </Button>
            <Button
              onClick={async () => {
                const url = window.location.origin;
                const shareData = {
                  title: "Reste connecté !",
                  text: `🎉 J'ai fait ${score}/${total} au quiz « ${themeMeta.label} » sur Reste connecté ! Essaie aussi de rester branché sur la culture des jeunes 👇`,
                  url,
                };
                try {
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    await navigator.share(shareData);
                    return;
                  }
                } catch (e) {
                  if ((e as Error).name === "AbortError") return;
                }
                try {
                  await navigator.clipboard.writeText(`${shareData.text} ${url}`);
                  toast.success("Lien copié ! Partagez-le 💌");
                } catch {
                  toast.error("Impossible de copier le lien");
                }
              }}
              size="lg"
              variant="default"
            >
              <Share2 />
              Partager mon score
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg mx-auto">
            <Button asChild size="lg" variant="outline">
              <Link to="/quiz">Autre thème</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/">
                <Home />
                Accueil
              </Link>
            </Button>
          </div>

          {!isLoggedIn && (
            <div className="mt-8 p-4 rounded-2xl bg-accent-soft border-2 border-accent/20">
              <p className="font-semibold mb-2">💾 Envie de sauvegarder vos progrès ?</p>
              <Button asChild variant="accent" size="default">
                <Link to="/connexion">Créer un compte gratuit</Link>
              </Button>
            </div>
          )}
        </div>

        {wrong.length > 0 && (
          <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-4">À retenir ({wrong.length})</h2>
            <div className="space-y-4">
              {wrong.map(({ q }, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-warning-soft p-4 border-2 border-warning/30"
                >
                  <p className="font-bold mb-2">{q.question}</p>
                  <p className="text-base">
                    <span className="font-semibold text-success">✅ Bonne réponse :</span>{" "}
                    {q.choices[displayIndexFromOriginal(q.choiceOrder, wrong[idx].a.correct)]}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{q.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">Thème : {themeMeta.label}</p>
      </main>
    </div>
  );
}
