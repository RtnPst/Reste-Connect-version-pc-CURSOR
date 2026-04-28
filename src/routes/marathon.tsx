import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Heart, Home, Volume2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare } from "@/lib/sfx";
import { Confetti } from "@/components/Confetti";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { isMarathonMilestone } from "@/lib/levels";

type Question = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  explanation: string;
};

export const Route = createFileRoute("/marathon")({
  head: () => ({
    meta: [
      { title: "Mode Marathon — Reste connecté !" },
      {
        name: "description",
        content:
          "Enchaînez les questions sans limite. Combien irez-vous loin ? Score infini, paliers à célébrer !",
      },
    ],
  }),
  component: MarathonPage,
});

function MarathonPage() {
  const { profile } = useAuth();
  const [pool, setPool] = useState<Question[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getPlayableQuestions({ limit: 100 });
      if (!data?.length) {
        setLoading(false);
        return;
      }
      setPool(data);
      setOrder([...Array(data.length).keys()].sort(() => Math.random() - 0.5));
      setLoading(false);
    })();
    return () => stopSpeaking();
  }, []);

  const current = useMemo<Question | null>(() => {
    if (!pool.length || !order.length) return null;
    return pool[order[pos % order.length]];
  }, [pool, order, pos]);

  const handleSelect = async (idx: number) => {
    if (selectedIndex !== null || !current) return;
    const result = await checkAnswer(current.id, idx);
    setSelectedIndex(idx);
    setRevealedCorrectIndex(result.correct_index);
    const sfxOn = profile?.sfx_enabled ?? true;
    if (result.correct) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      playCorrect(sfxOn);
      if (isMarathonMilestone(newScore)) {
        setShowCelebration(true);
        playFanfare(sfxOn);
        toast.success(`🎉 Palier ${newScore} bonnes réponses ! Continuez !`);
        setTimeout(() => setShowCelebration(false), 3500);
      }
    } else {
      setStreak(0);
      playWrong(sfxOn);
    }
  };

  const handleNext = () => {
    stopSpeaking();
    setPos((p) => p + 1);
    setSelectedIndex(null);
    setRevealedCorrectIndex(null);
    // Re-mélange quand on a fait le tour
    if ((pos + 1) % order.length === 0) {
      setOrder([...order].sort(() => Math.random() - 0.5));
    }
  };

  const handleSpeak = () => {
    if (!current) return;
    speak(
      `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
      true,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Préparation du marathon…</p>
        </main>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-lg text-destructive">Aucune question disponible.</p>
          <Button asChild variant="outline">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </main>
      </div>
    );
  }

  const themeMeta = THEMES[current.theme];
  const isAnswered = selectedIndex !== null;
  const isCorrect = isAnswered && selectedIndex === revealedCorrectIndex;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Confetti active={showCelebration} />
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-3xl py-6 sm:py-10">
        {/* Score bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-primary-soft text-primary p-3 text-center">
            <div className="text-xs font-bold opacity-80">Score</div>
            <div className="text-2xl font-extrabold">{score}</div>
          </div>
          <div className="rounded-2xl bg-warning-soft text-warning-foreground p-3 text-center">
            <div className="text-xs font-bold opacity-80">Série</div>
            <div className="text-2xl font-extrabold flex items-center justify-center gap-1">
              <Heart className="size-5 text-warning fill-warning" /> {streak}
            </div>
          </div>
          <div className="rounded-2xl bg-success-soft text-success-foreground p-3 text-center">
            <div className="text-xs font-bold opacity-80">Meilleure série</div>
            <div className="text-2xl font-extrabold">{bestStreak}</div>
          </div>
        </div>

        {/* Badge thème AVANT réponse */}
        <div className="mb-4 flex justify-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-extrabold border-2 animate-fade-in"
            style={{
              color: `var(--${themeMeta.colorVar})`,
              borderColor: `var(--${themeMeta.colorVar})`,
              backgroundColor: `color-mix(in oklab, var(--${themeMeta.colorVar}) 12%, transparent)`,
            }}
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
              onClick={handleSpeak}
              variant="ghost"
              size="icon"
              aria-label="Écouter la question"
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
                className = "border-2 border-success bg-success-soft";
                icon = <CheckCircle2 className="size-6 text-success flex-shrink-0" />;
              } else if (isSelected) {
                className = "border-2 border-destructive bg-destructive/10";
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

        {isAnswered && (
          <div
            className={`rounded-2xl p-5 mb-6 border-2 ${
              isCorrect ? "bg-success-soft border-success/30" : "bg-warning-soft border-warning/40"
            }`}
          >
            <p className="font-extrabold mb-2">
              {isCorrect ? "✅ Bonne réponse !" : "💡 La bonne réponse était :"}
            </p>
            <p className="leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {isAnswered ? (
          <Button onClick={handleNext} size="xl" variant="accent" className="w-full">
            Question suivante
            <ArrowRight />
          </Button>
        ) : (
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline inline-flex items-center gap-1"
            >
              <Home className="size-3.5" /> Quitter le marathon
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
