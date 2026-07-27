import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, CalendarCheck2, Flame, Home, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ImmersiveQuizPlay } from "@/components/immersive-quiz/ImmersiveQuizPlay";
import { ReturnToFilCard, RETURN_TO_FIL_HINT } from "@/components/ReturnToFilCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserBadgeIds, listNewBadgeNames } from "@/lib/badge-diff";
import { excerptExplanation, getConceptLabel } from "@/lib/concept-labels";
import { recordConceptSeen } from "@/lib/concept-memory";
import { getPlayableQuestions } from "@/lib/quiz-api";
import { checkAnswer } from "@/lib/quiz-security";
import { speak } from "@/lib/speech";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { toDisplayChoices } from "@/lib/choice-order";
import { parisCalendarDate } from "@/lib/paris-calendar";
import { shareCapturedConcept, sharePayload } from "@/lib/share";
import { trackEvent } from "@/lib/analytics";

type Q = {
  id: string;
  theme: ThemeKey;
  question: string;
  choices: string[];
  choiceOrder: number[];
  explanation: string;
  conceptKey: string | null;
};

export const Route = createFileRoute("/question-du-jour")({
  head: () => ({
    meta: [
      { title: "Question du jour — Tu captes ?" },
      {
        name: "description",
        content: "Une question chaque jour pour rester au rythme de la culture web.",
      },
    ],
  }),
  component: DailyQuestionPage,
});

function DailyQuestionPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [question, setQuestion] = useState<Q | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  /** After answering, sheet “Continuer” reveals the recap (layout-only state). */
  const [dailyRecap, setDailyRecap] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoading(true);
      setLoadError(null);
      const todayParis = parisCalendarDate();

      if (user) {
        const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("completed_at")
          .eq("user_id", user.id)
          .eq("mode", "daily")
          .gte("completed_at", since)
          .order("completed_at", { ascending: false })
          .limit(25);
        const doneToday = (attempts ?? []).some(
          (a) => parisCalendarDate(new Date(a.completed_at)) === todayParis,
        );
        if (doneToday) {
          if (!cancelled) {
            setAlreadyCompletedToday(true);
            setLoading(false);
          }
          return;
        }
      }

      try {
        const { data: daily, error: dailyErr } = await supabase
          .from("daily_questions")
          .select("question_id")
          .eq("active_date", todayParis)
          .maybeSingle();

        if (dailyErr) throw dailyErr;

        const scheduledId = daily?.question_id ?? null;

        /** Resolved only among live/playable rows (RPC filters status = live). */
        let row:
          | Awaited<ReturnType<typeof getPlayableQuestions>>[number]
          | undefined;

        if (scheduledId) {
          const scheduled = await getPlayableQuestions({ ids: [scheduledId], limit: 1 });
          row = scheduled[0];
        }

        // If nothing scheduled today, or scheduled ID is not playable (e.g. archived), pick any playable question.
        if (!row) {
          const fallback = await getPlayableQuestions({ limit: 1 });
          row = fallback[0];
        }

        if (cancelled) return;

        if (row) {
          const rawChoices = row.choices;
          const choicesArr = Array.isArray(rawChoices) ? rawChoices.map(String) : [];
          if (choicesArr.length === 0) {
            throw new Error("Question sans choix valides");
          }
          setQuestion({
            id: row.id,
            theme: row.theme,
            question: row.question,
            ...toDisplayChoices(choicesArr),
            explanation: row.explanation,
            conceptKey: row.conceptKey,
          });
        }
      } catch (e) {
        console.error("Daily question load failed", e);
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Chargement impossible");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setDailyRecap(false);
  }, [question?.id]);

  const handleSelect = async (idx: number) => {
    if (selected !== null || !question) return;
    const chosenOriginalIndex = question.choiceOrder[idx] ?? idx;
    const result = await checkAnswer(question.id, chosenOriginalIndex);
    setSelected(idx);
    setRevealedCorrectIndex(result.correct_index);
    // No auto-speak — user clicks the speaker button if they want to hear the explanation
    if (user) {
      let beforeBadgeIds = new Set<string>();
      try {
        beforeBadgeIds = await fetchUserBadgeIds(user.id);
      } catch {
        beforeBadgeIds = new Set();
      }

      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        theme: question.theme,
        mode: "daily",
        score: result.correct ? 1 : 0,
        total_questions: 1,
        question_ids: [question.id],
        answers: [
          { questionId: question.id, chosen: chosenOriginalIndex, correct: result.correct_index },
        ],
      });

      void recordConceptSeen({
        conceptKey: question.conceptKey,
        wasCorrect: result.correct,
        source: "daily",
      });

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

          // Daily rewards: +15 completion +5 if correct (max 20).
          const xpGain = 15 + (result.correct ? 5 : 0);
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
            toast.success(`Niveau ${newLevel} — nouvelle étape sur ton parcours.`);
          }
          await refreshProfile();
        }
      } catch (err) {
        console.error("Daily progression update failed", err);
        setXpGained(null);
      }

      try {
        const names = await listNewBadgeNames(user.id, beforeBadgeIds);
        if (names.length > 0) {
          toast.success(
            names.length === 1
              ? `Trace « ${names[0]} » ajoutée à ton fil.`
              : `Traces ajoutées : ${names.join(" · ")}`,
          );
        }
      } catch (e) {
        console.error("Badge diff after daily", e);
      }
    }
  };

  const handleSpeakExplanation = () => {
    if (!question || selected === null) return;
    const ok = (question.choiceOrder[selected] ?? selected) === revealedCorrectIndex;
    speak(`${ok ? "Bien vu." : "Voici pourquoi ça colle."} ${question.explanation}`, true);
  };

  const handleSpeakQuestion = () => {
    if (!question) return;
    speak(
      `${question.question}. Choix : ${question.choices.map((c, i) => `${i + 1}, ${c}`).join(". ")}`,
      true,
    );
  };

  const handleShare = async () => {
    const label = getConceptLabel(question.conceptKey);
    const result = label
      ? await shareCapturedConcept(label, { url: `${window.location.origin}/question-du-jour` })
      : await sharePayload({
          title: "Tu captes ?",
          text: "Je viens de faire la question du jour sur Tu captes ?",
          url: `${window.location.origin}/question-du-jour`,
        });
    void trackEvent({
      event_name: "share_clicked",
      user_id: user?.id,
      mode: "daily",
      event_props: {
        surface: "daily_result",
        outcome: result,
        has_concept: Boolean(label),
      },
    });
    if (result === "copied") toast.success("Lien copié dans le presse-papiers");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 items-center justify-center overflow-x-clip px-4">
          <p>On prépare ta question du jour…</p>
        </main>
      </div>
    );
  }

  if (!question && !alreadyCompletedToday) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center overflow-x-clip px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 px-6 py-10 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-3xl">
              <Sparkles className="size-8 text-primary" aria-hidden />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Rien n’est calé pour aujourd’hui
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {loadError ? (
                <>
                  <span className="font-semibold text-destructive">{loadError}</span>
                  <span className="block mt-2">
                    Vérifie ta connexion ou réessaie. Tu peux aussi lancer un quiz par thème en attendant.
                  </span>
                </>
              ) : (
                <>
                  La question du jour n’est pas encore publiée, ou le jeu n’a pas pu charger de contenu. Ce n’est pas
                  lié à ton compte : tu peux quand même t’entraîner en quiz.
                </>
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="accent" size="lg" className="font-extrabold">
                <Link to="/quiz">
                  <BookOpen className="size-5" />
                  Choisir un thème
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Accueil</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (alreadyCompletedToday) {
    const streak = profile?.current_streak ?? 0;
    const longestStreak = profile?.longest_streak ?? 0;
    const handleShareDone = async () => {
      const result = await sharePayload({
        title: "Tu captes ?",
        text: "J’ai déjà fait la question du jour sur Tu captes ? — et toi ?",
        url: `${window.location.origin}/question-du-jour`,
      });
      void trackEvent({
        event_name: "share_clicked",
        user_id: user?.id,
        mode: "daily",
        event_props: {
          surface: "daily_already_done",
          outcome: result,
          has_concept: false,
        },
      });
      if (result === "copied") toast.success("Lien copié dans le presse-papiers");
    };

    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center overflow-x-clip px-4 py-10 sm:py-14">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-gradient-to-b from-primary-soft/55 to-card px-6 py-10 text-center shadow-[var(--shadow-soft)] sm:px-10 sm:py-12">
            <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <CalendarCheck2 className="size-9" strokeWidth={2.25} aria-hidden />
            </span>
            <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">Fil du jour</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Capté pour aujourd’hui
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Tu as déjà fait le fil du jour. Reviens demain si l’envie t’y prend — série et XP restent sur ton profil.
            </p>
            {user ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft/80 px-3 py-1.5 font-semibold text-foreground">
                  <Flame className="size-4 text-warning" aria-hidden />
                  Série : {streak} jour{streak > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 font-semibold text-muted-foreground">
                  Record : {longestStreak} jour{longestStreak > 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                <Link to="/connexion" className="font-bold text-primary underline-offset-4 hover:underline">
                  Connecte-toi
                </Link>{" "}
                pour suivre ta série sur plusieurs jours.
              </p>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Button type="button" onClick={handleShareDone} variant="accent" size="lg" className="font-semibold">
                <Share2 className="size-5" />
                Partager
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/quiz">Un quiz</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/">
                  <Home className="size-5" />
                  Accueil
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isAnswered = selected !== null;
  const isCorrect =
    isAnswered &&
    selected !== null &&
    (question?.choiceOrder[selected] ?? selected) === revealedCorrectIndex;
  const themeMeta = question ? THEMES[question.theme] : null;
  const streak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const streakMessage =
    streak > 0 && longestStreak > 0 && streak + 1 >= longestStreak
      ? "Encore un jour pour égaler ton record perso."
      : streak > 0
        ? `Série : ${streak} jour${streak > 1 ? "s" : ""} — merci de tenir le rythme.`
        : "Une réponse suffit pour avancer ta série aujourd’hui.";

  if (!question || alreadyCompletedToday) {
    return null;
  }

  if (!themeMeta) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
        <AppHeader />
        <main className="flex min-w-0 flex-1 items-center justify-center px-4">
          <p className="text-destructive">Thème de question introuvable.</p>
        </main>
      </div>
    );
  }

  if (!dailyRecap) {
    return (
      <ImmersiveQuizPlay
        quitHref="/"
        headerCenter={
          <>
            <span aria-hidden className="shrink-0">
              🌅
            </span>
            <span className="truncate font-extrabold">Question du jour</span>
          </>
        }
        streak={streak}
        streakTitle={streakMessage}
        progressPercent={isAnswered ? 100 : 0}
        stepFraction="1/1"
        flowStepKey={question.id}
        questionText={question.question}
        questionSubtitle={
          <span style={{ color: `var(--${themeMeta.colorVar})` }}>
            {themeMeta.emoji} {themeMeta.short}
          </span>
        }
        belowProgressSlot={
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-medium leading-snug text-muted-foreground sm:text-xs">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            {!user ? (
              <p className="text-[11px] leading-snug text-muted-foreground sm:text-sm">
                <Link to="/connexion" className="font-bold text-primary underline-offset-4 hover:underline">
                  Connecte-toi
                </Link>{" "}
                pour garder ton XP et ta série.
              </p>
            ) : null}
          </div>
        }
        choices={question.choices}
        selectedIndex={selected}
        revealedCorrectIndex={revealedCorrectIndex}
        choiceOrder={question.choiceOrder}
        onSelectChoice={(idx) => void handleSelect(idx)}
        onSpeakQuestion={handleSpeakQuestion}
        isCorrect={!!isCorrect}
        explanation={question.explanation}
        onSpeakExplanation={handleSpeakExplanation}
        onPrimaryNext={() => setDailyRecap(true)}
        primaryNextLabel="Voir la suite"
        conceptCapture={
          isCorrect
            ? { conceptKey: question.conceptKey, explanation: question.explanation }
            : undefined
        }
      />
    );
  }

  const conceptLabel = getConceptLabel(question.conceptKey);
  const decodeText = excerptExplanation(question.explanation);
  const recapTitle = isCorrect ? "Tu as capté" : "Pas encore capté";
  const recapKicker = isCorrect ? null : "Le fil continue — voici le décode";

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
          Question du jour
        </span>
        <Button variant="ghost" size="sm" className="shrink-0 px-2 font-semibold" asChild>
          <Link to="/play">Jouer</Link>
        </Button>
      </header>
      <main className="container mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-8 sm:py-10">
        <div
          className={`mb-6 rounded-2xl border p-5 text-center sm:p-7 ${
            isCorrect
              ? "border-primary/35 bg-primary-soft/50"
              : "border-accent/30 bg-accent-soft/25"
          }`}
        >
          <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">
            Fil du jour
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{recapTitle}</h1>
          {recapKicker ? (
            <p className="mt-1 text-sm font-medium text-muted-foreground sm:text-base">{recapKicker}</p>
          ) : null}
          {conceptLabel ? (
            <p className="mt-4 text-lg font-bold leading-snug text-primary sm:text-xl">{conceptLabel}</p>
          ) : null}
          <p
            className={`mt-3 text-sm leading-relaxed sm:text-base ${
              conceptLabel
                ? "mx-auto max-w-md text-muted-foreground"
                : "mx-auto max-w-lg font-medium text-foreground/90"
            }`}
          >
            {decodeText}
          </p>
          {xpGained !== null ? (
            <p className="mt-6 text-[11px] text-muted-foreground/70">+{xpGained} XP — un pas de plus sur le fil</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5">
          <Button onClick={handleShare} variant="outline" size="lg" className="min-h-[52px]">
            <Share2 />
            Partager ce moment
          </Button>
          <ReturnToFilCard hint={RETURN_TO_FIL_HINT.daily} className="mt-2" />
        </div>
      </main>
    </div>
  );
}
