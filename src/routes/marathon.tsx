import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Heart, Home } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ImmersiveQuizPlay } from "@/components/immersive-quiz/ImmersiveQuizPlay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare } from "@/lib/sfx";
import { Confetti } from "@/components/Confetti";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { isMarathonMilestone } from "@/lib/levels";
import { toDisplayChoices } from "@/lib/choice-order";
import { getNextActionSuggestion } from "@/lib/next-action";
import {
  buildNextMarathonState,
  selectNextMarathonQuestion,
  type MarathonSelectorState,
} from "@/lib/marathon-selector";
import { createAnalyticsRunId, trackEvent } from "@/lib/analytics";

type Question = {
  id: string;
  theme: ThemeKey;
  difficulty: "facile" | "moyen" | "difficile";
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
};

const MARATHON_BEST_LS = "marathon_best_score";

function readGuestMarathonBest(): number {
  try {
    const n = Number(localStorage.getItem(MARATHON_BEST_LS));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export const Route = createFileRoute("/marathon")({
  head: () => ({
    meta: [
      { title: "Mode Marathon — Tu captes ?" },
      {
        name: "description",
        content:
          "Enchaîne les questions sans limite. Jusqu’où tu vas ? Score infini, paliers à célébrer !",
      },
    ],
  }),
  component: MarathonPage,
});

function MarathonPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [pool, setPool] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answeredCountBase, setAnsweredCountBase] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [xpGained, setXpGained] = useState<number>(0);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [guestMarathonBest, setGuestMarathonBest] = useState(() => readGuestMarathonBest());
  const [recentQuestionIds, setRecentQuestionIds] = useState<string[]>([]);
  const [recentThemes, setRecentThemes] = useState<string[]>([]);
  const [recentDifficulties, setRecentDifficulties] = useState<("facile" | "moyen" | "difficile")[]>(
    [],
  );
  const [recentMisses, setRecentMisses] = useState<boolean[]>([]);
  const [recentConcepts, setRecentConcepts] = useState<Array<string | null>>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const runStartMsRef = useRef<number | null>(null);
  const startedSentRef = useRef(false);
  const completedSentRef = useRef(false);
  const marathonEndedSentRef = useRef(false);

  useEffect(() => {
    if (!user) setGuestMarathonBest(readGuestMarathonBest());
  }, [user]);

  useEffect(() => {
    (async () => {
      const data = await getPlayableQuestions({ limit: 100 });
      if (!data?.length) {
        setLoading(false);
        return;
      }
      setPool(
        data.map((q) => {
          const choiceData = toDisplayChoices(q.choices);
          return {
            ...q,
            choices: choiceData.choices,
            choiceOrder: choiceData.choiceOrder,
          };
        }),
      );
      setLoading(false);
    })();
    return () => stopSpeaking();
  }, []);

  const selectorState = useMemo<MarathonSelectorState>(
    () => ({
      answeredCount: answeredCountBase,
      streak,
      recentQuestionIds,
      recentThemes,
      recentDifficulties,
      recentMisses,
      recentConcepts,
    }),
    [
      answeredCountBase,
      streak,
      recentQuestionIds,
      recentThemes,
      recentDifficulties,
      recentMisses,
      recentConcepts,
    ],
  );

  useEffect(() => {
    if (currentQuestion || !pool.length) return;
    const next = selectNextMarathonQuestion(pool, selectorState);
    setCurrentQuestion(next);
  }, [pool, currentQuestion, selectorState]);

  useEffect(() => {
    if (loading || sessionEnded || !currentQuestion) return;
    if (!user?.id || startedSentRef.current) return;
    const nextRunId = createAnalyticsRunId();
    setRunId(nextRunId);
    runStartMsRef.current = Date.now();
    startedSentRef.current = true;
    completedSentRef.current = false;
    marathonEndedSentRef.current = false;
    void trackEvent({
      event_name: "mode_started",
      user_id: user.id,
      mode: "marathon",
      run_id: nextRunId,
      event_props: {
        entry_surface: "deep_link",
        is_retry: false,
      },
    });
  }, [currentQuestion, loading, sessionEnded, user?.id]);

  const current = currentQuestion;
  const answeredCount = answeredCountBase + (selectedIndex !== null ? 1 : 0);
  const persistedMarathonRecord = user
    ? Math.max(0, profile?.marathon_best_score ?? 0)
    : guestMarathonBest;
  const recordDisplay = Math.max(persistedMarathonRecord, score);

  useEffect(() => {
    if (!sessionEnded || !user?.id || !runId) return;
    const answeredCountFinal = answeredCountBase + (selectedIndex !== null ? 1 : 0);
    const durationSec = runStartMsRef.current
      ? Math.max(0, Math.round((Date.now() - runStartMsRef.current) / 1000))
      : 0;
    if (!completedSentRef.current) {
      completedSentRef.current = true;
      void trackEvent({
        event_name: "mode_completed",
        user_id: user.id,
        mode: "marathon",
        run_id: runId,
        event_props: {
          score,
          total_questions: answeredCountFinal,
          duration_sec: durationSec,
          completed: true,
        },
      });
    }
    if (!marathonEndedSentRef.current) {
      marathonEndedSentRef.current = true;
      void trackEvent({
        event_name: "marathon_ended",
        user_id: user.id,
        mode: "marathon",
        run_id: runId,
        event_props: {
          answered_count: answeredCountFinal,
          correct_count: score,
          best_score_at_end: Math.max(persistedMarathonRecord, score),
          duration_sec: durationSec,
        },
      });
    }
  }, [answeredCountBase, persistedMarathonRecord, runId, score, selectedIndex, sessionEnded, user?.id]);

  const handleSelect = async (idx: number) => {
    if (selectedIndex !== null || !current) return;
    const chosenOriginalIndex = current.choiceOrder[idx] ?? idx;
    const result = await checkAnswer(current.id, chosenOriginalIndex);
    setSelectedIndex(idx);
    setRevealedCorrectIndex(result.correct_index);
    const sfxOn = profile?.sfx_enabled ?? true;
    if (result.correct) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      playCorrect(sfxOn);
      if (isMarathonMilestone(newScore)) {
        setShowCelebration(true);
        playFanfare(sfxOn);
        toast.success(
          `🎉 Palier ${newScore} bonnes réponses ! Pense à terminer la session pour enregistrer tes XP.`,
        );
        setTimeout(() => setShowCelebration(false), 3500);
      }
    } else {
      setStreak(0);
      playWrong(sfxOn);
    }
  };

  const handleNext = () => {
    if (!current) return;
    stopSpeaking();
    const isCurrentCorrect =
      selectedIndex !== null &&
      revealedCorrectIndex !== null &&
      (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;
    const nextState = buildNextMarathonState(selectorState, current, isCurrentCorrect);
    setAnsweredCountBase(nextState.answeredCount);
    setRecentQuestionIds(nextState.recentQuestionIds);
    setRecentThemes(nextState.recentThemes);
    setRecentDifficulties(nextState.recentDifficulties);
    setRecentMisses(nextState.recentMisses);
    setRecentConcepts(nextState.recentConcepts);
    setCurrentQuestion(selectNextMarathonQuestion(pool, nextState));
    setSelectedIndex(null);
    setRevealedCorrectIndex(null);
  };

  const handleSpeak = () => {
    if (!current) return;
    speak(
      `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
      true,
    );
  };

  const handleSpeakExplanation = () => {
    if (!current || selectedIndex === null) return;
    const ok = (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;
    speak(`${ok ? "Bonne réponse !" : "Pas tout à fait."} ${current.explanation}`, true);
  };

  const handleEndSession = async () => {
    stopSpeaking();
    const answeredCount = answeredCountBase + (selectedIndex !== null ? 1 : 0);
    const correctCount = score;
    const rawXp = correctCount * 4 + 10 * Math.floor(correctCount / 10);
    const grantedXp = Math.min(rawXp, 120);

    setXpGained(0);
    setStreakUpdated(false);

    if (user) {
      try {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak, last_play_date, total_xp, marathon_best_score")
          .eq("id", user.id)
          .maybeSingle();

        if (dbProfile) {
          const today = new Date().toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          let newStreak = dbProfile.current_streak;
          let didUpdateStreak = false;

          if (answeredCount >= 5 && dbProfile.last_play_date !== today) {
            newStreak = dbProfile.last_play_date === yesterday ? newStreak + 1 : 1;
            didUpdateStreak = true;
          }

          const oldLevel = Math.floor(dbProfile.total_xp / 100) + 1;
          const newTotalXp = dbProfile.total_xp + grantedXp;
          const newLevel = Math.floor(newTotalXp / 100) + 1;

          const nextMarathonBest = Math.max(dbProfile.marathon_best_score ?? 0, correctCount);

          const updatePayload: {
            total_xp: number;
            marathon_best_score: number;
            current_streak?: number;
            longest_streak?: number;
            last_play_date?: string;
          } = { total_xp: newTotalXp, marathon_best_score: nextMarathonBest };

          if (didUpdateStreak) {
            updatePayload.current_streak = newStreak;
            updatePayload.longest_streak = Math.max(newStreak, dbProfile.longest_streak);
            updatePayload.last_play_date = today;
          }

          const { error: updateError } = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", user.id);

          if (updateError) {
            console.error("Marathon progression update failed", {
              message: updateError?.message,
              code: updateError?.code,
              details: updateError?.details,
              hint: updateError?.hint,
              userId: user.id,
              answeredCount,
              correctCount,
              grantedXp,
            });
            throw updateError;
          }

          setXpGained(grantedXp);
          if (newLevel > oldLevel) {
            toast.success(`Niveau ${newLevel} atteint !`);
          }

          setStreakUpdated(didUpdateStreak);
          await refreshProfile();
        } else {
          console.error("Marathon profile not found", {
            userId: user.id,
            answeredCount,
            correctCount,
            grantedXp,
          });
          toast.error("Progression non enregistrée. Réessayez plus tard.");
        }
      } catch (err) {
        console.error("Marathon progression persistence error", {
          userId: user.id,
          answeredCount,
          correctCount,
          grantedXp,
          error: err,
        });
        toast.error("Progression non enregistrée. Réessayez plus tard.");
        setXpGained(0);
      }
    } else {
      const nextGuestBest = Math.max(readGuestMarathonBest(), correctCount);
      try {
        localStorage.setItem(MARATHON_BEST_LS, String(nextGuestBest));
      } catch {
        /* ignore quota / private mode */
      }
      setGuestMarathonBest(nextGuestBest);
    }

    setSessionEnded(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p className="text-lg text-muted-foreground">On chauffe le marathon…</p>
        </main>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center gap-4 overflow-x-clip px-4">
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
  const isCorrect =
    isAnswered &&
    selectedIndex !== null &&
    (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;
  const streakDays = profile?.current_streak ?? 0;
  const streakHint =
    streakDays > 0 ? "Ta série sur l’app" : "Connecte-toi pour faire grandir ta série.";

  if (sessionEnded) {
    const nextAction = getNextActionSuggestion({
      mode: "marathon",
      isLoggedIn: !!user,
      score,
      total: answeredCount,
    });
    return (
      <div className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-clip bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <header className="flex min-h-[3rem] shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-2 py-2 backdrop-blur-sm">
          <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
            <Link to="/" className="flex items-center font-semibold text-muted-foreground">
              <Home className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-xs font-extrabold sm:text-sm">
            Session marathon
          </span>
          <Button variant="ghost" size="sm" className="shrink-0 px-2 font-semibold" asChild>
            <Link to="/quiz">Quiz</Link>
          </Button>
        </header>
        <main className="container mx-auto w-full min-w-0 max-w-2xl flex-1 overflow-y-auto overflow-x-clip px-4 py-8 text-center sm:px-6 sm:py-10">
          <div className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-[var(--shadow-card)]">
            <h1 className="text-3xl font-extrabold mb-2">Session terminée</h1>
            <p className="text-muted-foreground mb-1">
              Questions répondues :{" "}
              <span className="font-bold text-foreground">{answeredCount}</span>
            </p>
            <p className="text-muted-foreground mb-4">
              Bonnes réponses : <span className="font-bold text-foreground">{score}</span>
            </p>
            <p className="text-sm sm:text-base font-semibold text-success mb-2">
              +{xpGained} XP gagnés
            </p>
            {streakUpdated ? (
              <p className="text-sm text-primary mb-6">🔥 Série validée pour aujourd’hui.</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">
                Réponds à au moins 5 questions pour valider ta série.
              </p>
            )}
            <div className="mb-4 rounded-2xl border border-primary/25 bg-primary-soft/60 px-4 py-3 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Prochaine meilleure action
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{nextAction.reason}</p>
              <Button asChild size="lg" variant="accent" className="mt-3 w-full">
                <Link
                  to={nextAction.to}
                  onClick={() => {
                    void trackEvent({
                      event_name: "post_run_cta_clicked",
                      user_id: user?.id,
                      mode: "marathon",
                      run_id: runId,
                      event_props: {
                        cta_id: "next_action_primary",
                        source_mode: "marathon",
                        destination: nextAction.to,
                        score_context: score,
                        total_context: answeredCount,
                      },
                    });
                  }}
                >
                  {nextAction.label}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" variant="accent">
                <Link to="/">
                  <Home />
                  Retour à l'accueil
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/quiz">Faire un quiz complet</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] min-w-0 flex-col overflow-hidden bg-background">
      <Confetti active={showCelebration} />
      <ImmersiveQuizPlay
        quitHref="/"
        quitAriaLabel="Quitter le marathon"
        headerCenter={
          <>
            <span aria-hidden className="shrink-0">
              🏃
            </span>
            <span className="truncate">Marathon</span>
          </>
        }
        streak={streakDays}
        streakTitle={streakHint}
        progressPercent={null}
        stepFraction={`${score}/${answeredCount}`}
        flowStepKey={`${current.id}-${answeredCountBase}-${answeredCount}`}
        questionText={current.question}
        belowProgressSlot={
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5 text-center [@media(max-height:700px)]:gap-1">
              <div className="rounded-xl bg-primary-soft/90 py-1.5 text-primary">
                <div className="text-[9px] font-bold uppercase opacity-80">Bonnes</div>
                <div className="text-lg font-extrabold leading-tight sm:text-xl">{score}</div>
              </div>
              <div className="rounded-xl bg-warning-soft/90 py-1.5 text-warning-foreground">
                <div className="flex items-center justify-center gap-0.5 text-[9px] font-bold uppercase opacity-80">
                  <Heart className="size-3 fill-warning text-warning" aria-hidden /> Série
                </div>
                <div className="text-lg font-extrabold leading-tight sm:text-xl">{streak}</div>
              </div>
              <div className="rounded-xl bg-success-soft/90 py-1.5 text-success-foreground">
                <div className="text-[9px] font-bold uppercase opacity-80">Record</div>
                <div className="text-lg font-extrabold leading-tight sm:text-xl">{recordDisplay}</div>
              </div>
            </div>
            <div className="flex justify-center">
              <span
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border-2 px-2.5 py-0.5 text-[11px] font-extrabold sm:text-xs"
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
            <p className="text-center text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
              Tes XP Marathon sont enregistrés quand tu termines la session.
            </p>
          </div>
        }
        choices={current.choices}
        selectedIndex={selectedIndex}
        revealedCorrectIndex={revealedCorrectIndex}
        choiceOrder={current.choiceOrder}
        onSelectChoice={(idx) => void handleSelect(idx)}
        onSpeakQuestion={handleSpeak}
        isCorrect={!!isCorrect}
        explanation={current.explanation}
        onSpeakExplanation={handleSpeakExplanation}
        onPrimaryNext={handleNext}
        primaryNextLabel="Question suivante"
        sheetSecondaryAction={{ label: "Terminer la session", onClick: handleEndSession }}
        footerWhenPlaying={
          <div className="flex w-full max-w-md flex-col gap-2 mx-auto">
            <Button type="button" onClick={handleEndSession} size="lg" variant="outline" className="w-full">
              Terminer la session
            </Button>
            <Link
              to="/"
              className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline sm:text-sm inline-flex items-center justify-center gap-1"
            >
              <Home className="size-3.5" aria-hidden /> Accueil
            </Link>
          </div>
        }
      />
    </div>
  );
}
