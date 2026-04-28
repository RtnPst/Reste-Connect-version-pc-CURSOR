import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Home,
  Lock,
  RotateCcw,
  Star,
  Volume2,
  XCircle,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare } from "@/lib/sfx";
import { Confetti } from "@/components/Confetti";
import { THEMES, type ThemeKey } from "@/lib/themes";
import {
  QUESTIONS_PER_LEVEL,
  PASS_PERCENTAGE,
  TOTAL_LEVELS,
  getRankForLevel,
  loadProgress,
  saveLevelResult,
  getDifficultyForLevel,
} from "@/lib/levels";

type Question = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  explanation: string;
};

export const Route = createFileRoute("/niveau/$n")({
  head: ({ params }) => ({
    meta: [
      { title: `Niveau ${params.n} — Reste connecté !` },
      {
        name: "description",
        content: `Niveau ${params.n} du parcours — ${QUESTIONS_PER_LEVEL} questions à enchaîner.`,
      },
    ],
  }),
  component: LevelPage,
});

function LevelPage() {
  const { n } = Route.useParams();
  const level = Math.max(1, Math.min(TOTAL_LEVELS, parseInt(n, 10) || 1));
  const rank = getRankForLevel(level);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ chosen: number; correct: number }[]>([]);
  const [finished, setFinished] = useState(false);

  // Vérifier le déblocage
  useEffect(() => {
    const p = loadProgress();
    if (level > p.unlocked) {
      setLocked(true);
      setLoading(false);
    }
  }, [level]);

  // Charger les questions
  useEffect(() => {
    if (locked) return;
    (async () => {
      const difficulty = getDifficultyForLevel(level);
      const data = await getPlayableQuestions({ limit: 100 });

      if (!data || data.length === 0) {
        setError("Impossible de charger les questions.");
        setLoading(false);
        return;
      }

      const filteredByDifficulty = (data ?? []).filter((q) => q.difficulty === difficulty);
      const source =
        filteredByDifficulty.length >= QUESTIONS_PER_LEVEL ? filteredByDifficulty : (data ?? []);
      const shuffled = [...source].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_LEVEL);
      setQuestions(
        shuffled.map((q) => ({
          id: q.id,
          theme: q.theme,
          question: q.question,
          choices: q.choices,
          explanation: q.explanation,
        })),
      );
      setLoading(false);
    })();

    return () => stopSpeaking();
  }, [level, locked]);

  const current = questions[currentIndex];
  const progressPct = useMemo(
    () =>
      questions.length
        ? ((currentIndex + (selectedIndex !== null ? 1 : 0)) / questions.length) * 100
        : 0,
    [currentIndex, selectedIndex, questions.length],
  );

  const handleSelect = async (idx: number) => {
    if (selectedIndex !== null || !current) return;
    const result = await checkAnswer(current.id, idx);
    setSelectedIndex(idx);
    setRevealedCorrectIndex(result.correct_index);
    setAnswers((p) => [...p, { chosen: idx, correct: result.correct_index }]);
    const sfxOn = profile?.sfx_enabled ?? true;
    if (result.correct) playCorrect(sfxOn);
    else playWrong(sfxOn);
  };

  const handleNext = () => {
    stopSpeaking();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealedCorrectIndex(null);
    } else {
      const score = answers.filter((a) => a.chosen === a.correct).length;
      saveLevelResult(level, score);
      setFinished(true);
      if ((score / questions.length) * 100 >= PASS_PERCENTAGE) {
        playFanfare(profile?.sfx_enabled ?? true);
      }
    }
  };

  const handleSpeakQuestion = () => {
    if (!current) return;
    speak(
      `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
      true,
    );
  };

  const handleSpeakExplanation = () => {
    if (!current || selectedIndex === null) return;
    const isCorrect = selectedIndex === revealedCorrectIndex;
    speak(`${isCorrect ? "Bonne réponse !" : "Pas tout à fait."} ${current.explanation}`, true);
  };

  if (locked) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <Lock className="size-12 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold">Niveau verrouillé</h1>
          <p className="text-muted-foreground max-w-md">
            Terminez les niveaux précédents pour débloquer celui-ci.
          </p>
          <Button asChild variant="accent" size="lg">
            <Link to="/niveaux">Retour au parcours</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Chargement du niveau…</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-lg text-destructive">{error}</p>
          <Button asChild variant="outline">
            <Link to="/niveaux">Retour au parcours</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (finished) {
    const score = answers.filter((a) => a.chosen === a.correct).length;
    const percent = Math.round((score / questions.length) * 100);
    const passed = percent >= PASS_PERCENTAGE;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Confetti active={passed} />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 max-w-2xl py-10 text-center">
          <div className="bg-card rounded-3xl border-2 border-border p-8 shadow-[var(--shadow-card)] animate-scale-in">
            <div className="text-7xl mb-3">{passed ? rank.emoji : "💪"}</div>
            <h1 className="text-3xl font-extrabold mb-2">
              {passed ? `Niveau ${level} validé !` : "Presque !"}
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Score :{" "}
              <span className="font-extrabold text-primary">
                {score} / {questions.length}
              </span>
            </p>
            <p className="text-base text-muted-foreground mb-6">
              {passed
                ? `Rang ${rank.label} — vous débloquez le niveau ${Math.min(level + 1, TOTAL_LEVELS)} !`
                : `Il faut au moins ${Math.ceil((PASS_PERCENTAGE / 100) * questions.length)}/${questions.length} pour valider.`}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {passed && level < TOTAL_LEVELS ? (
                <Button
                  size="lg"
                  variant="accent"
                  onClick={() => navigate({ to: "/niveau/$n", params: { n: String(level + 1) } })}
                >
                  Niveau suivant
                  <ArrowRight />
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="accent"
                  onClick={() => {
                    setQuestions([]);
                    setCurrentIndex(0);
                    setSelectedIndex(null);
                    setAnswers([]);
                    setFinished(false);
                    setLoading(true);
                    setTimeout(
                      () => navigate({ to: "/niveau/$n", params: { n: String(level) } }),
                      50,
                    );
                  }}
                >
                  <RotateCcw />
                  Rejouer
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link to="/niveaux">
                  <Home />
                  Parcours
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!current) return null;

  const themeMeta = THEMES[current.theme];
  const isAnswered = selectedIndex !== null;
  const isCorrect = isAnswered && selectedIndex === revealedCorrectIndex;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-6 sm:py-10">
        {/* En-tête niveau */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-extrabold"
              style={{
                color: `var(--${rank.colorVar})`,
                backgroundColor: `color-mix(in oklab, var(--${rank.colorVar}) 15%, transparent)`,
              }}
            >
              {rank.emoji} Niveau {level} · {rank.label}
            </span>
            <span className="text-sm font-bold text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <Progress value={progressPct} className="h-3" />
        </div>

        {/* Badge thème de la question (visible AVANT de répondre) */}
        <div className="mb-4 flex justify-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-extrabold border-2 animate-fade-in"
            style={{
              color: `var(--${themeMeta.colorVar})`,
              borderColor: `var(--${themeMeta.colorVar})`,
              backgroundColor: `color-mix(in oklab, var(--${themeMeta.colorVar}) 12%, transparent)`,
            }}
            aria-label={`Thème : ${themeMeta.label}`}
          >
            <span aria-hidden>{themeMeta.emoji}</span>
            {themeMeta.short}
          </span>
        </div>

        {/* Question */}
        <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-[var(--shadow-soft)] mb-6">
          <div className="flex items-start gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug flex-1">
              {current.question}
            </h1>
            <Button
              onClick={handleSpeakQuestion}
              variant="ghost"
              size="icon"
              aria-label="Écouter la question"
              title="Écouter la question"
              className="flex-shrink-0"
            >
              <Volume2 />
            </Button>
          </div>
        </div>

        {/* Choix */}
        <div className="grid gap-3 mb-6">
          {current.choices.map((choice, idx) => {
            const isSelected = selectedIndex === idx;
            const isCorrectChoice = idx === revealedCorrectIndex;

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

        {/* Explication */}
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
                title="Écouter l'explication"
                className="flex-shrink-0"
              >
                <Volume2 />
              </Button>
            </div>
          </div>
        )}

        {isAnswered && (
          <Button onClick={handleNext} size="xl" variant="accent" className="w-full">
            {currentIndex + 1 < questions.length ? "Question suivante" : "Voir mon score"}
            <ArrowRight />
          </Button>
        )}

        {!isAnswered && (
          <div className="text-center">
            <Link
              to="/niveaux"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Retour au parcours
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
