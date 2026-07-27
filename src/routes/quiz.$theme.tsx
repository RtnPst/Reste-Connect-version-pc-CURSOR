import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Home, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ImmersiveQuizPlay } from "@/components/immersive-quiz/ImmersiveQuizPlay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserBadgeIds, listNewBadgeNames } from "@/lib/badge-diff";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare, stopMusic } from "@/lib/sfx";
import { ConceptCaptureEcho } from "@/components/immersive-quiz/ConceptCaptureEcho";
import { ReturnToFilCard, RETURN_TO_FIL_HINT } from "@/components/ReturnToFilCard";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { displayIndexFromOriginal, toDisplayChoices } from "@/lib/choice-order";
import {
  getQuestionConceptProxy,
  rankCandidatesByConceptFreshness,
  wouldRepeatConceptTooSoon,
} from "@/lib/concept-runtime";
import { pickSessionCapturedConceptLabel } from "@/lib/concept-capture";
import { excerptExplanation, getConceptLabel } from "@/lib/concept-labels";
import { recordConceptSeen } from "@/lib/concept-memory";
import { getNextActionSuggestion } from "@/lib/next-action";
import { createAnalyticsRunId, trackEvent } from "@/lib/analytics";
import { shareCapturedConcept, sharePayload } from "@/lib/share";

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
const DAILY_XP_BONUS = 20;
const LUCKY_XP_CHANCE = 0.1;

function applyConceptSpacing(questions: Question[]): Question[] {
  if (questions.length <= 1) return questions;

  const pool = [...questions];
  const selected: Question[] = [];
  let recentConcepts: Array<string | null> = [];

  const pickOne = (enforceConceptRecency: boolean): Question | null => {
    if (pool.length === 0) return null;
    const ranked = rankCandidatesByConceptFreshness(pool, recentConcepts);
    for (const q of ranked) {
      const concept = getQuestionConceptProxy(q);
      if (enforceConceptRecency && wouldRepeatConceptTooSoon(concept, recentConcepts, 3)) continue;
      return q;
    }
    return ranked[0] ?? null;
  };

  while (pool.length > 0) {
    // Pass 1: prefer concept freshness.
    let chosen = pickOne(true);
    // Pass 2: relax concept recency if constrained.
    if (!chosen) chosen = pickOne(false);
    if (!chosen) break;

    selected.push(chosen);
    recentConcepts = [...recentConcepts, getQuestionConceptProxy(chosen)].slice(-6);

    const idx = pool.findIndex((q) => q.id === chosen?.id);
    if (idx >= 0) pool.splice(idx, 1);
    else pool.shift();
  }

  return selected.length === questions.length ? selected : questions;
}

export const Route = createFileRoute("/quiz/$theme")({
  validateSearch: () => ({}),
  beforeLoad: ({ params, search }) => {
    if (params.theme === "epoque") {
      throw redirect({ to: "/quiz/epoque/", replace: true });
    }
    if (params.theme !== "culture_pop") return;
    const raw = (search as Record<string, unknown>).piste;
    const piste = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    let target: ThemeKey = "trends_pop_culture";
    if (piste === "gaming") target = "gaming";
    else if (piste === "relations") target = "relations_lifestyle";
    else if (piste === "internet" || piste === "musique") target = "trends_pop_culture";
    throw redirect({
      to: "/quiz/$theme",
      params: { theme: target },
      replace: true,
    });
  },
  head: ({ params }) => {
    const t = THEMES[params.theme as ThemeKey];
    return {
      meta: [
        { title: `Quiz ${t?.label ?? ""} — Tu captes ?` },
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
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [dailyBonusApplied, setDailyBonusApplied] = useState(false);
  const [luckyBonusApplied, setLuckyBonusApplied] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const runStartMsRef = useRef<number | null>(null);
  const startedSentRef = useRef(false);
  const completedSentRef = useRef(false);

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
        applyConceptSpacing(
          data.map((q) => {
          const shuffled = toDisplayChoices(q.choices);
          return {
            ...q,
            choices: shuffled.choices,
            choiceOrder: shuffled.choiceOrder,
          };
          }),
        ),
      );
      setLoading(false);
    })();

    return () => stopSpeaking();
  }, [themeKey, themeMeta]);

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
        if (user && result.correct) {
          void recordConceptSeen({
            conceptKey: current.conceptKey,
            wasCorrect: true,
            source: "theme",
          });
        }
      } catch {
        toast.error("Impossible de verifier la reponse");
      }
    },
    [selectedIndex, current, profile?.sfx_enabled, user],
  );

  const handleSpeakExplanation = () => {
    if (!current || selectedIndex === null) return;
    const isCorrect = selectedIndex === revealedCorrectIndex;
    speak(`${isCorrect ? "Bien vu." : "Voici pourquoi ça colle."} ${current.explanation}`, true);
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
      if (user) {
        const progression = await saveAttempt(user.id, score, questions, answers, refreshProfile);
        if (!progression.attemptSaved) {
          toast.error("Impossible d'enregistrer ce quiz. Réessaie dans quelques secondes.");
          return;
        }
        if (progression.xpGained !== null) {
          setXpGained(progression.xpGained);
          setLevelUpTo(progression.levelUpTo);
          setDailyBonusApplied(progression.dailyBonusApplied);
          setLuckyBonusApplied(progression.luckyBonusApplied);
          if (progression.levelUpTo !== null) {
            toast.success(`Niveau ${progression.levelUpTo} — nouvelle étape sur ton parcours.`);
          }
          if (progression.dailyBonusApplied) {
            toast.success("Bonus du jour activé sur ce passage.");
          }
          if (progression.luckyBonusApplied) {
            toast.success("Bonus de session — XP doublés sur cette question.");
          }
        }
        if (progression.newBadgeNames.length > 0) {
          const n = progression.newBadgeNames;
          toast.success(
            n.length === 1
              ? `Trace « ${n[0]} » ajoutée à ton fil.`
              : `Traces ajoutées : ${n.join(" · ")}`,
          );
        }
      }
    }
  }, [currentIndex, profile?.sfx_enabled, user, score, questions, answers, refreshProfile]);

  const handleSpeakQuestion = () => {
    if (!current) return;
    const text = `${current.question}. Choix : ${current.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`;
    speak(text, true);
  };

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

  useEffect(() => {
    if (loading || error || finished || !questions.length) return;
    if (!user?.id || startedSentRef.current) return;
    const nextRunId = createAnalyticsRunId();
    setRunId(nextRunId);
    runStartMsRef.current = Date.now();
    startedSentRef.current = true;
    completedSentRef.current = false;
    void trackEvent({
      event_name: "mode_started",
      user_id: user.id,
      mode: "theme",
      run_id: nextRunId,
      event_props: {
        entry_surface: "deep_link",
        theme: themeKey,
        is_retry: false,
      },
    });
  }, [loading, error, finished, questions.length, themeKey, user?.id]);

  useEffect(() => {
    if (!finished || !user?.id || !runId || completedSentRef.current) return;
    completedSentRef.current = true;
    const durationSec = runStartMsRef.current
      ? Math.max(0, Math.round((Date.now() - runStartMsRef.current) / 1000))
      : 0;
    void trackEvent({
      event_name: "mode_completed",
      user_id: user.id,
      mode: "theme",
      run_id: runId,
      event_props: {
        score,
        total_questions: questions.length,
        duration_sec: durationSec,
        completed: true,
        theme: themeKey,
      },
    });
  }, [finished, questions.length, runId, score, themeKey, user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 flex-1 items-center justify-center overflow-x-clip px-4">
          <p className="text-lg text-muted-foreground">On te prépare un run sur ce thème…</p>
        </main>
      </div>
    );
  }

  if (error || !themeMeta) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-x-clip px-4">
          <p className="text-lg text-destructive">{error ?? "Theme introuvable."}</p>
          <Button asChild variant="outline">
            <Link to="/quiz">Revenir aux themes</Link>
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
        xpGained={xpGained}
        levelUpTo={levelUpTo}
        dailyBonusApplied={dailyBonusApplied}
        luckyBonusApplied={luckyBonusApplied}
        runId={runId}
        userId={user?.id ?? null}
        onReplay={() => {
          setQuestions([]);
          setCurrentIndex(0);
          setSelectedIndex(null);
          setRevealedCorrectIndex(null);
          setAnswers([]);
          setScore(0);
          setXpGained(null);
          setLevelUpTo(null);
          setDailyBonusApplied(false);
          setLuckyBonusApplied(false);
          setRunId(null);
          runStartMsRef.current = null;
          startedSentRef.current = false;
          completedSentRef.current = false;
          setFinished(false);
          setLoading(true);
          setTimeout(() => {
            navigate({
              to: "/quiz/$theme",
              params: { theme: themeKey },
            });
          }, 50);
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
  const streak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const streakMessage =
    streak > 0 && longestStreak > 0 && streak + 1 >= longestStreak
      ? "Encore un jour pour égaler ton record perso sur l’app."
      : streak > 0
        ? `Série : ${streak} jour${streak > 1 ? "s" : ""} sur l’app. La question du jour la prolonge si tu veux.`
        : "Série : la question du jour la fait grandir, à ton rythme.";

  const flowStepKey = `${current.id}-${currentIndex}`;

  return (
    <ImmersiveQuizPlay
      quitHref="/quiz"
      headerCenter={
        <>
          <span aria-hidden className="shrink-0">
            {themeMeta.emoji}
          </span>
          <span className="truncate">{themeMeta.short}</span>
        </>
      }
      streak={streak}
      streakTitle={streakMessage}
      progressPercent={progress}
      stepFraction={`${currentIndex + 1}/${questions.length}`}
      flowStepKey={flowStepKey}
      questionText={current.question}
      choices={current.choices}
      selectedIndex={selectedIndex}
      revealedCorrectIndex={revealedCorrectIndex}
      choiceOrder={current.choiceOrder}
      onSelectChoice={(idx) => void handleSelect(idx)}
      onSpeakQuestion={handleSpeakQuestion}
      isCorrect={!!isCorrect}
      explanation={current.explanation}
      onSpeakExplanation={handleSpeakExplanation}
      onPrimaryNext={handleNext}
      primaryNextLabel={currentIndex + 1 < questions.length ? "Suite" : "Voir la suite"}
      conceptCapture={
        isCorrect
          ? { conceptKey: current.conceptKey, explanation: current.explanation }
          : undefined
      }
      footerWhenPlaying={
        <Link
          to="/quiz"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline sm:text-sm"
        >
          Changer de thème
        </Link>
      }
    />
  );
}

async function saveAttempt(
  userId: string,
  score: number,
  questions: Question[],
  answers: { questionId: string; chosen: number; correct: number }[],
  refreshProfile: () => Promise<void>,
): Promise<{
  attemptSaved: boolean;
  xpGained: number | null;
  levelUpTo: number | null;
  newBadgeNames: string[];
  dailyBonusApplied: boolean;
  luckyBonusApplied: boolean;
}> {
  try {
    const beforeBadgeIds = await fetchUserBadgeIds(userId);

    const { error: attemptInsertError } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      theme: questions[0]?.theme ?? null,
      mode: "theme",
      score,
      total_questions: questions.length,
      question_ids: questions.map((q) => q.id),
      answers: answers,
    });
    if (attemptInsertError) {
      return {
        attemptSaved: false,
        xpGained: null,
        levelUpTo: null,
        newBadgeNames: [],
        dailyBonusApplied: false,
        luckyBonusApplied: false,
      };
    }

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
      const baseXpGain = score * 10;
      const isFirstQuizToday = last !== today;
      const dailyBonus = isFirstQuizToday ? DAILY_XP_BONUS : 0;
      const luckyBonusApplied = Math.random() < LUCKY_XP_CHANCE;
      const luckyMultiplier = luckyBonusApplied ? 2 : 1;
      const xpGain = (baseXpGain + dailyBonus) * luckyMultiplier;
      const oldLevel = Math.floor(profile.total_xp / 100) + 1;
      const newTotalXp = profile.total_xp + xpGain;
      const newLevel = Math.floor(newTotalXp / 100) + 1;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, profile.longest_streak),
          last_play_date: today,
          total_xp: newTotalXp,
        })
        .eq("id", userId);
      if (updateError) {
        throw updateError;
      }
      await refreshProfile();
      let newBadgeNames: string[] = [];
      try {
        newBadgeNames = await listNewBadgeNames(userId, beforeBadgeIds);
      } catch {
        newBadgeNames = [];
      }
      return {
        attemptSaved: true,
        xpGained: xpGain,
        levelUpTo: newLevel > oldLevel ? newLevel : null,
        newBadgeNames,
        dailyBonusApplied: isFirstQuizToday,
        luckyBonusApplied,
      };
    }
    let newBadgeNames: string[] = [];
    try {
      newBadgeNames = await listNewBadgeNames(userId, beforeBadgeIds);
    } catch {
      newBadgeNames = [];
    }
    return {
      attemptSaved: true,
      xpGained: null,
      levelUpTo: null,
      newBadgeNames,
      dailyBonusApplied: false,
      luckyBonusApplied: false,
    };
  } catch (err) {
    console.error("Save attempt failed", err);
    return {
      attemptSaved: false,
      xpGained: null,
      levelUpTo: null,
      newBadgeNames: [],
      dailyBonusApplied: false,
      luckyBonusApplied: false,
    };
  }
}

function ResultsScreen({
  score,
  total,
  questions,
  answers,
  themeKey,
  isLoggedIn,
  xpGained,
  levelUpTo,
  dailyBonusApplied,
  luckyBonusApplied,
  runId,
  userId,
  onReplay,
}: {
  score: number;
  total: number;
  questions: Question[];
  answers: { questionId: string; chosen: number; correct: number }[];
  themeKey: ThemeKey;
  isLoggedIn: boolean;
  xpGained: number | null;
  levelUpTo: number | null;
  dailyBonusApplied: boolean;
  luckyBonusApplied: boolean;
  runId: string | null;
  userId: string | null;
  onReplay: () => void;
}) {
  const themeMeta = THEMES[themeKey];
  const percentage = Math.round((score / total) * 100);
  const message =
    percentage === 100
      ? "Tu as tout capté sur ce fil."
      : percentage >= 70
        ? "Tu repars avec une lecture solide."
        : percentage >= 40
          ? "Des accroches à repasser quand tu veux — c’est normal."
          : "Rien de dramatique : c’est du terrain à explorer.";
  const nextAction = getNextActionSuggestion({
    mode: "theme",
    isLoggedIn,
    score,
    total,
  });

  const wrong = answers
    .map((a, i) => ({ a, q: questions[i] }))
    .filter(({ a }) => a.chosen !== a.correct);

  const focalQuestion = wrong[0]?.q ?? questions[questions.length - 1];
  const takeawayLabel = focalQuestion ? getConceptLabel(focalQuestion.conceptKey) : null;
  const takeawayText = focalQuestion ? excerptExplanation(focalQuestion.explanation, 180) : null;
  const sessionCapturedLabel = pickSessionCapturedConceptLabel(questions, answers);

  const handleShare = async () => {
    const label = sessionCapturedLabel ?? takeawayLabel;
    if (label) {
      const result = await shareCapturedConcept(label);
      if (result === "copied") toast.success("Copié dans le presse-papiers");
      return;
    }
    const result = await sharePayload({
      title: "Tu captes ?",
      text: `J’ai exploré « ${themeMeta.short} » sur Tu captes ?.`,
    });
    if (result === "copied") toast.success("Lien copié dans le presse-papiers");
  };

  return (
    <div className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-clip bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="flex min-h-[3rem] shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-2 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
          <Link to="/" className="flex items-center font-semibold text-muted-foreground">
            <Home className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
        </Button>
        <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-muted-foreground sm:text-sm">
          Ce que tu retiens · {themeMeta.emoji} {themeMeta.short}
        </span>
        <Button variant="ghost" size="sm" className="shrink-0 px-2 font-semibold" asChild>
          <Link to="/quiz">Thèmes</Link>
        </Button>
      </header>
      <main className="container mx-auto w-full min-w-0 max-w-3xl flex-1 overflow-x-clip overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="quiz-result-card mb-6 animate-scale-in rounded-3xl border border-border/80 bg-card p-6 text-center shadow-[var(--shadow-soft)] sm:p-10">
          <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">
            {themeMeta.emoji} {themeMeta.short}
          </p>
          <h1 className="mx-auto mt-2 max-w-lg text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {message}
          </h1>
          {sessionCapturedLabel ? <ConceptCaptureEcho label={sessionCapturedLabel} /> : null}
          {takeawayLabel ? (
            <p className="mx-auto mt-4 max-w-md text-lg font-bold leading-snug text-primary sm:text-xl">
              {takeawayLabel}
            </p>
          ) : null}
          {takeawayText ? (
            <p
              className={`mx-auto max-w-md text-sm leading-relaxed sm:text-base ${
                takeawayLabel ? "mt-2 text-muted-foreground" : "mt-4 font-medium text-foreground/90"
              }`}
            >
              {takeawayText}
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            {nextAction.reason}
          </p>
          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/75">
            {score} / {total} lectures captées
            {xpGained !== null ? (
              <>
                {" "}
                · +{xpGained} XP sur le fil
                {dailyBonusApplied ? " · bonus du jour" : null}
                {luckyBonusApplied ? " · bonus session" : null}
              </>
            ) : null}
          </p>
          {levelUpTo !== null ? (
            <p className="mt-1.5 text-[11px] text-primary/85">Nouvelle étape sur Le chemin.</p>
          ) : null}

          <div className="mx-auto mt-8 flex min-w-0 max-w-lg flex-col gap-2.5">
            <Button asChild size="lg" variant="accent" className="min-w-0 whitespace-normal">
              <Link
                to={nextAction.to}
                onClick={() => {
                  void trackEvent({
                    event_name: "post_run_cta_clicked",
                    user_id: userId,
                    mode: "theme",
                    run_id: runId,
                    event_props: {
                      cta_id: "next_action_primary",
                      source_mode: "theme",
                      destination: nextAction.to,
                      score_context: score,
                      total_context: total,
                    },
                  });
                }}
              >
                {nextAction.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button onClick={onReplay} size="lg" variant="outline" className="min-w-0 whitespace-normal">
              <RotateCcw />
              Rejouer ce thème
            </Button>
          </div>

          <ReturnToFilCard
            hint={RETURN_TO_FIL_HINT.theme}
            className="mx-auto mt-6 max-w-lg"
            variant="strip"
          />

          <div className="mx-auto mt-3 flex min-w-0 max-w-lg flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
            >
              <Share2 className="size-3.5" aria-hidden />
              Partager
            </button>
            <Link to="/quiz" className="underline-offset-4 hover:text-foreground hover:underline">
              Autre thème
            </Link>
          </div>

          {!isLoggedIn && (
            <div className="mt-8 rounded-2xl border border-accent/20 bg-accent-soft/80 p-4">
              <p className="mb-2 font-semibold text-sm">
                Compte gratuit : garde ta progression et ta série sur l’app.
              </p>
              <Button asChild variant="accent" size="default">
                <Link to="/connexion">Créer un compte gratuit</Link>
              </Button>
            </div>
          )}
        </div>

        {wrong.length > 0 && (
          <div className="animate-soft-rise rounded-3xl border border-border/60 bg-muted/20 p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">Le décode ({wrong.length})</h2>
            <div className="space-y-4">
              {wrong.map(({ q }, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[var(--shadow-soft)]"
                >
                  <p className="mb-2 break-words font-bold">{q.question}</p>
                  <p className="break-words text-base">
                    <span className="text-[11px] font-medium tracking-[0.1em] text-primary/75">
                      La bonne lecture
                    </span>
                    <br />
                    <span className="font-medium text-foreground">
                      {q.choices[displayIndexFromOriginal(q.choiceOrder, wrong[idx].a.correct)]}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{q.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground/70">{themeMeta.label}</p>
      </main>
    </div>
  );
}
