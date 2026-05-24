import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Home, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ImmersiveQuizPlay } from "@/components/immersive-quiz/ImmersiveQuizPlay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserBadgeIds, listNewBadgeNames } from "@/lib/badge-diff";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare } from "@/lib/sfx";
import { Confetti } from "@/components/Confetti";
import { RankBadge } from "@/components/RankBadge";
import { selectLevelQuestions } from "@/lib/levels-selector";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { toDisplayChoices } from "@/lib/choice-order";
import { getNextActionSuggestion } from "@/lib/next-action";
import { createAnalyticsRunId, trackEvent } from "@/lib/analytics";
import {
  QUESTIONS_PER_LEVEL,
  PASS_PERCENTAGE,
  TOTAL_LEVELS,
  getPassRequiredCorrect,
  getRankForLevel,
  getEffectiveUnlockedLevel,
  mergeProgress,
  loadProgress,
  saveLevelResult,
} from "@/lib/levels";

type Question = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
};

export const Route = createFileRoute("/niveau/$n")({
  head: ({ params }) => ({
    meta: [
      { title: `Niveau ${params.n} — Tu captes ?` },
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
  const passRequired = getPassRequiredCorrect(QUESTIONS_PER_LEVEL);
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxUnlocked = useMemo(() => getEffectiveUnlockedLevel(!!user, profile), [user, profile]);
  const locked = level > maxUnlocked;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ chosen: number; correct: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const runStartMsRef = useRef<number | null>(null);
  const startedSentRef = useRef(false);
  const completedSentRef = useRef(false);
  const levelResultSentRef = useRef(false);

  // Same route component instance when only $n changes: reset run state or "finished"
  // stays true and answers from the previous level pair with the new level param.
  useEffect(() => {
    setFinished(false);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealedCorrectIndex(null);
    setCheckingAnswer(false);
    setAnswerError(null);
    setAnswers([]);
    setXpGained(null);
    setLevelUpTo(null);
    setError(null);
    setQuestions([]);
    setLoading(true);
    setRunId(null);
    runStartMsRef.current = null;
    startedSentRef.current = false;
    completedSentRef.current = false;
    levelResultSentRef.current = false;
  }, [level]);

  // Charger les questions
  useEffect(() => {
    if (locked) return;
    (async () => {
      try {
        setError(null);
        const data = await getPlayableQuestions({ limit: 100 });

        if (!data || data.length === 0) {
          setError("Impossible de charger les questions pour ce niveau.");
          return;
        }

        const selected = selectLevelQuestions(data ?? [], level, QUESTIONS_PER_LEVEL);
        if (selected.length < QUESTIONS_PER_LEVEL) {
          setError("Questions insuffisantes pour composer ce niveau. Réessaie plus tard.");
          return;
        }
        setQuestions(
          selected.map((q) => {
            const choiceData = toDisplayChoices(q.choices);
            return {
              id: q.id,
              theme: q.theme,
              question: q.question,
              choices: choiceData.choices,
              choiceOrder: choiceData.choiceOrder,
              explanation: q.explanation,
            };
          }),
        );
      } catch (err) {
        console.error("Erreur chargement questions:", err);
        setError("Erreur lors du chargement des questions.");
      } finally {
        setLoading(false);
      }
    })();

    return () => stopSpeaking();
  }, [level, locked, replayKey, user, profile]);

  const current = questions[currentIndex];
  const progressPct = useMemo(
    () =>
      questions.length
        ? ((currentIndex + (selectedIndex !== null ? 1 : 0)) / questions.length) * 100
        : 0,
    [currentIndex, selectedIndex, questions.length],
  );

  const handleSelect = async (idx: number) => {
    if (selectedIndex !== null || !current || checkingAnswer) return;
    setAnswerError(null);
    setCheckingAnswer(true);
    const chosenOriginalIndex = current.choiceOrder[idx] ?? idx;
    try {
      const result = await checkAnswer(current.id, chosenOriginalIndex);
      setSelectedIndex(idx);
      setRevealedCorrectIndex(result.correct_index);
      setAnswers((p) => [...p, { chosen: chosenOriginalIndex, correct: result.correct_index }]);
      const sfxOn = profile?.sfx_enabled ?? true;
      if (result.correct) playCorrect(sfxOn);
      else playWrong(sfxOn);
    } catch {
      setAnswerError(
        "Une erreur est survenue pendant la vérification. Réessayez dans quelques secondes.",
      );
    } finally {
      setCheckingAnswer(false);
    }
  };

  const handleNext = async () => {
    stopSpeaking();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealedCorrectIndex(null);
      setAnswerError(null);
    } else {
      const score = answers.filter((a) => a.chosen === a.correct).length;
      const localProgress = saveLevelResult(level, score);
      setFinished(true);
      let beforeBadgeIds = new Set<string>();
      if (user) {
        try {
          beforeBadgeIds = await fetchUserBadgeIds(user.id);
        } catch {
          beforeBadgeIds = new Set();
        }
      }
      const passed = (score / questions.length) * 100 >= PASS_PERCENTAGE;
      if (passed) {
        playFanfare(profile?.sfx_enabled ?? true);
      }

      if (user) {
        try {
          const mergedProgress = mergeProgress(localProgress, {
            max_unlocked_level: profile?.max_unlocked_level,
            level_best_scores: profile?.level_best_scores,
          });
          const { error: levelSyncError } = await supabase
            .from("profiles")
            .update({
              max_unlocked_level: mergedProgress.unlocked,
              level_best_scores: mergedProgress.best,
            })
            .eq("id", user.id);
          if (levelSyncError) {
            throw levelSyncError;
          }
        } catch (err) {
          const error = err as {
            message?: string;
            code?: string;
            details?: string | null;
            hint?: string | null;
          };
          console.error("Level progression sync failed", {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            userId: user.id,
            level,
            localUnlocked: localProgress.unlocked,
            localBestForLevel: localProgress.best[level] ?? 0,
          });
        }
      }

      if (user) {
        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("current_streak, longest_streak, last_play_date, total_xp")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile) {
            const today = new Date().toISOString().slice(0, 10);
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            let newStreak = dbProfile.current_streak;
            if (dbProfile.last_play_date !== today) {
              newStreak = dbProfile.last_play_date === yesterday ? newStreak + 1 : 1;
            }

            const xpGain = score * 8 + 5 + (passed ? 10 : 0) + (score === questions.length ? 5 : 0);
            const oldLevel = Math.floor(dbProfile.total_xp / 100) + 1;
            const newTotalXp = dbProfile.total_xp + xpGain;
            const newLevel = Math.floor(newTotalXp / 100) + 1;

            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, dbProfile.longest_streak),
                last_play_date: today,
                total_xp: newTotalXp,
              })
              .eq("id", user.id);
            if (updateError) {
              throw updateError;
            }

            setXpGained(xpGain);
            if (newLevel > oldLevel) {
              setLevelUpTo(newLevel);
              toast.success(`Niveau ${newLevel} atteint !`);
            } else {
              setLevelUpTo(null);
            }
            await refreshProfile();
          }
        } catch (err) {
          console.error("Level progression update failed", err);
        }
      }
      if (user) {
        try {
          const names = await listNewBadgeNames(user.id, beforeBadgeIds);
          if (names.length > 0) {
            toast.success(
              names.length === 1
                ? `Badge « ${names[0]} » débloqué !`
                : `Badges débloqués : ${names.join(" · ")}`,
            );
          }
        } catch (err) {
          console.error("Badge check failed", err);
        }
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
    speak(`${isCorrect ? "Bien vu." : "Voici pourquoi ça colle."} ${current.explanation}`, true);
  };

  useEffect(() => {
    if (locked || loading || error || finished || !questions.length) return;
    if (!user?.id || startedSentRef.current) return;
    const nextRunId = createAnalyticsRunId();
    setRunId(nextRunId);
    runStartMsRef.current = Date.now();
    startedSentRef.current = true;
    completedSentRef.current = false;
    levelResultSentRef.current = false;
    void trackEvent({
      event_name: "mode_started",
      user_id: user.id,
      mode: "level",
      run_id: nextRunId,
      event_props: {
        entry_surface: "deep_link",
        level,
        is_retry: replayKey > 0,
      },
    });
  }, [error, finished, level, loading, locked, questions.length, replayKey, user?.id]);

  useEffect(() => {
    if (!finished || !user?.id || !runId || !questions.length) return;
    const score = answers.filter((a) => a.chosen === a.correct).length;
    const passed = Math.round((score / questions.length) * 100) >= PASS_PERCENTAGE;
    const durationSec = runStartMsRef.current
      ? Math.max(0, Math.round((Date.now() - runStartMsRef.current) / 1000))
      : 0;
    if (!completedSentRef.current) {
      completedSentRef.current = true;
      void trackEvent({
        event_name: "mode_completed",
        user_id: user.id,
        mode: "level",
        run_id: runId,
        event_props: {
          score,
          total_questions: questions.length,
          duration_sec: durationSec,
          completed: true,
          level,
        },
      });
    }
    if (!levelResultSentRef.current) {
      levelResultSentRef.current = true;
      void trackEvent({
        event_name: "level_result",
        user_id: user.id,
        mode: "level",
        run_id: runId,
        event_props: {
          level,
          passed,
          score,
          total_questions: questions.length,
          required_to_pass: passRequired,
        },
      });
    }
  }, [answers, finished, level, passRequired, questions.length, runId, user?.id]);

  if (locked) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center gap-4 overflow-x-clip px-4 text-center">
          <Lock className="size-12 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold">Niveau verrouillé</h1>
          <p className="text-muted-foreground max-w-md">
            {!user
              ? "Sans compte, seul le niveau 1 est dispo. Connecte-toi pour retrouver tes niveaux débloqués."
              : "Termine les niveaux précédents pour ouvrir celui-ci."}
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
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p className="text-lg text-muted-foreground">Chargement du niveau…</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center gap-4 overflow-x-clip px-4">
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
    const nextAction = getNextActionSuggestion({
      mode: "level",
      isLoggedIn: !!user,
      score,
      total: questions.length,
      passed,
      level,
      totalLevels: TOTAL_LEVELS,
    });
    return (
      <div className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-clip bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Confetti active={passed} />
        <header className="flex min-h-[3rem] shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-2 py-2 backdrop-blur-sm">
          <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
            <Link to="/" className="flex items-center font-semibold text-muted-foreground">
              <Home className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-xs font-extrabold text-foreground sm:text-sm">
            Résultat · Niveau {level}
          </span>
          <Button variant="ghost" size="sm" className="shrink-0 px-2 font-semibold" asChild>
            <Link to="/niveaux">Parcours</Link>
          </Button>
        </header>
        <main className="container mx-auto w-full min-w-0 max-w-2xl flex-1 overflow-y-auto overflow-x-clip px-4 py-8 text-center sm:py-10">
          <div className="bg-card rounded-3xl border-2 border-border p-8 shadow-[var(--shadow-card)] animate-scale-in">
            <div className="mb-4 flex justify-center">
              {passed ? (
                <RankBadge rank={rank} level={level} size="lg" />
              ) : (
                <div
                  className="flex size-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/35 text-muted-foreground"
                  aria-hidden
                >
                  <BookOpen className="size-8" strokeWidth={2} />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl mb-2">
              {passed
                ? `Palier ${level} validé.`
                : "Pas validé cette fois — tu peux reprendre le run quand tu veux."}
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Réponses justes :{" "}
              <span className="font-extrabold text-primary">
                {score} / {questions.length}
              </span>
            </p>
            <p className="text-base text-muted-foreground mb-6">
              {passed
                ? `« ${rank.label} » — le palier ${Math.min(level + 1, TOTAL_LEVELS)} s’ouvre si tu en as envie.`
                : `Seuil du palier : au moins ${passRequired} bonnes réponses sur ${QUESTIONS_PER_LEVEL}.`}
            </p>
            <p className="mb-4 text-xs sm:text-sm font-medium text-muted-foreground">
              Les badges sans faute se gagnent surtout sur les quiz thème.
            </p>
            {xpGained !== null && (
              <p className="text-sm sm:text-base font-semibold text-success mb-2">
                +{xpGained} XP gagnés
              </p>
            )}
            {levelUpTo !== null && (
              <p className="text-sm sm:text-base font-semibold text-primary mb-6">
                Palier {levelUpTo} débloqué.
              </p>
            )}
            <p className="mb-4 text-sm font-medium leading-relaxed text-muted-foreground">
              {nextAction.reason}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {passed && level < TOTAL_LEVELS ? (
                <Button
                  size="lg"
                  variant="accent"
                  onClick={() => {
                    void trackEvent({
                      event_name: "post_run_cta_clicked",
                      user_id: user?.id,
                      mode: "level",
                      run_id: runId,
                      event_props: {
                        cta_id: "next_action_primary",
                        source_mode: "level",
                        destination: `/niveau/${level + 1}`,
                        score_context: score,
                        total_context: questions.length,
                      },
                    });
                    navigate({ to: "/niveau/$n", params: { n: String(level + 1) } });
                  }}
                >
                  Niveau suivant
                  <ArrowRight />
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="accent"
                  onClick={() => {
                    void trackEvent({
                      event_name: "post_run_cta_clicked",
                      user_id: user?.id,
                      mode: "level",
                      run_id: runId,
                      event_props: {
                        cta_id: "next_action_primary",
                        source_mode: "level",
                        destination: `/niveau/${level}`,
                        score_context: score,
                        total_context: questions.length,
                      },
                    });
                    setQuestions([]);
                    setCurrentIndex(0);
                    setSelectedIndex(null);
                    setRevealedCorrectIndex(null);
                    setAnswerError(null);
                    setCheckingAnswer(false);
                    setError(null);
                    setAnswers([]);
                    setXpGained(null);
                    setLevelUpTo(null);
                    setFinished(false);
                    setLoading(true);
                    setReplayKey((k) => k + 1);
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
  const isCorrect =
    isAnswered &&
    selectedIndex !== null &&
    (current.choiceOrder[selectedIndex] ?? selectedIndex) === revealedCorrectIndex;
  const streak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const streakMessage =
    streak > 0 && longestStreak > 0 && streak + 1 >= longestStreak
      ? "Encore un jour pour égaler ton record perso sur l’app."
      : streak > 0
        ? `Série : ${streak} jour${streak > 1 ? "s" : ""} sur l’app.`
        : "Enchaîne à ton rythme — la série suit surtout via la question du jour.";

  return (
    <ImmersiveQuizPlay
      quitHref="/niveaux"
      headerCenter={
        <>
          <span className="shrink-0">
            <RankBadge rank={rank} level={level} size="sm" />
          </span>
          <span className="truncate font-extrabold">{rank.label}</span>
        </>
      }
      streak={streak}
      streakTitle={streakMessage}
      progressPercent={progressPct}
      stepFraction={`${currentIndex + 1}/${questions.length}`}
      flowStepKey={`${current.id}-${currentIndex}`}
      questionText={current.question}
      belowProgressSlot={
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold sm:text-sm"
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
      }
      choices={current.choices}
      selectedIndex={selectedIndex}
      revealedCorrectIndex={revealedCorrectIndex}
      choiceOrder={current.choiceOrder}
      onSelectChoice={(idx) => void handleSelect(idx)}
      choicesDisabled={checkingAnswer}
      onSpeakQuestion={handleSpeakQuestion}
      isCorrect={!!isCorrect}
      explanation={current.explanation}
      onSpeakExplanation={handleSpeakExplanation}
      onPrimaryNext={handleNext}
      primaryNextLabel={currentIndex + 1 < questions.length ? "Suite" : "Voir la suite"}
      statusMessage={
        checkingAnswer ? (
          <span className="text-muted-foreground">Vérification…</span>
        ) : answerError ? (
          <span className="text-destructive">{answerError}</span>
        ) : undefined
      }
      footerWhenPlaying={
        <Link
          to="/niveaux"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline sm:text-sm"
        >
          Retour au parcours
        </Link>
      }
    />
  );
}
