import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, CheckCircle2, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ConceptCaptureBeat } from "@/components/immersive-quiz/ConceptCaptureBeat";
import { buildConceptCaptureCopy } from "@/lib/concept-capture";
import { shouldUseCompactChoiceGrid } from "@/lib/immersive-choice-layout";

/** Short pause before explanation body fades in (ms); skipped when reduced motion is on. */
const EXPLANATION_REVEAL_DELAY_MS = 150;
/** Calm recognition beat before “Le décode” (correct + concept capture enabled). */
const CONCEPT_CAPTURE_BEAT_MS = 1700;

const FEEDBACK_CORRECT = ["Ça colle.", "Bien capté.", "Oui, là.", "Exact."] as const;
const FEEDBACK_INCORRECT = ["Pas tout à fait.", "Le bon fil.", "À retenir.", "Voici la lecture."] as const;

function feedbackLine(lines: readonly string[], key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i)) | 0;
  return lines[Math.abs(hash) % lines.length] ?? lines[0];
}

const shortScreen = "[@media(max-height:700px)]:";

/** Larger type for short answers; step down only when text is long enough to risk overflow. */
function immersiveAnswerTextClasses(choice: string): string {
  const sh = "[@media(max-height:700px)]:";
  const n = choice.length;
  if (n <= 32) {
    return `text-base font-semibold leading-snug sm:text-lg sm:leading-snug ${sh}text-base ${sh}leading-snug`;
  }
  if (n <= 56) {
    return `text-[15px] font-semibold leading-snug sm:text-base sm:leading-normal ${sh}text-sm ${sh}leading-snug`;
  }
  return `line-clamp-4 text-sm font-semibold leading-snug sm:text-[15px] sm:leading-normal ${sh}text-[13px] ${sh}leading-tight`;
}

function compactAnswerTextClasses(choice: string): string {
  const n = choice.length;
  if (n <= 22) {
    return "line-clamp-3 text-sm font-semibold leading-snug sm:text-[15px]";
  }
  return "line-clamp-3 text-[13px] font-semibold leading-snug sm:text-sm";
}

export type ImmersiveQuizPlayProps = {
  quitHref: string;
  quitAriaLabel?: string;
  /** Main title row in top bar (emoji + label) */
  headerCenter: ReactNode;
  /** Optional small chip in header (e.g. piste) — keep narrow */
  headerChip?: ReactNode;
  streak: number;
  streakTitle?: string;
  /** 0–100, or null to hide the thin progress bar */
  progressPercent: number | null;
  /** Shown on the right of the header, e.g. "3/10" or "12" */
  stepFraction: string;
  flowStepKey: string;
  questionText: string;
  questionSubtitle?: ReactNode;
  choices: string[];
  selectedIndex: number | null;
  revealedCorrectIndex: number | null;
  choiceOrder: number[];
  onSelectChoice: (index: number) => void;
  choicesDisabled?: boolean;
  onSpeakQuestion: () => void;
  isCorrect: boolean;
  explanation: string;
  onSpeakExplanation: () => void;
  onPrimaryNext: () => void | Promise<void>;
  primaryNextLabel: string;
  /** Optional second action in sheet footer (e.g. Marathon “Terminer la session”) */
  sheetSecondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  /** Link row below answers when no answer yet (hidden on short screens per theme quiz) */
  footerWhenPlaying?: ReactNode;
  /** Inline status under grid (e.g. “Vérification…”) */
  statusMessage?: ReactNode;
  /** Between progress bar and question (e.g. Marathon score strip) */
  belowProgressSlot?: ReactNode;
  /**
   * Controls bottom sheet visibility. Defaults to `selectedIndex !== null`.
   * Use for flows where the sheet must stay closed after a local “continue” step (e.g. question du jour).
   */
  sheetOpen?: boolean;
  /** When set, a brief “Tu as capté” beat plays on correct answers before Le décode. */
  conceptCapture?: {
    conceptKey: string | null;
    explanation: string;
  };
};

export function ImmersiveQuizPlay({
  quitHref,
  quitAriaLabel = "Fermer et revenir",
  headerCenter,
  headerChip,
  streak,
  streakTitle,
  progressPercent,
  stepFraction,
  flowStepKey,
  questionText,
  questionSubtitle,
  choices,
  selectedIndex,
  revealedCorrectIndex,
  choiceOrder,
  onSelectChoice,
  choicesDisabled = false,
  onSpeakQuestion,
  isCorrect,
  explanation,
  onSpeakExplanation,
  onPrimaryNext,
  primaryNextLabel,
  sheetSecondaryAction,
  footerWhenPlaying,
  statusMessage,
  belowProgressSlot,
  sheetOpen: sheetOpenProp,
  conceptCapture,
}: ImmersiveQuizPlayProps) {
  const isAnswered = selectedIndex !== null;
  const sheetVisible = sheetOpenProp !== undefined ? sheetOpenProp : isAnswered;
  const reducedMotion = usePrefersReducedMotion();
  const [explanationRevealed, setExplanationRevealed] = useState(false);
  const [captureBeatDone, setCaptureBeatDone] = useState(false);

  const captureActive = Boolean(conceptCapture && isCorrect && isAnswered);
  const captureCopy = conceptCapture
    ? buildConceptCaptureCopy(conceptCapture.conceptKey, conceptCapture.explanation)
    : null;
  const showCaptureBeat = captureActive && !captureBeatDone && captureCopy !== null;

  useEffect(() => {
    setCaptureBeatDone(false);
    setExplanationRevealed(false);
  }, [flowStepKey]);

  useEffect(() => {
    if (!captureActive) {
      setCaptureBeatDone(false);
      return;
    }
    if (reducedMotion) {
      setCaptureBeatDone(true);
      return;
    }
    setCaptureBeatDone(false);
    const id = window.setTimeout(() => setCaptureBeatDone(true), CONCEPT_CAPTURE_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [captureActive, reducedMotion, flowStepKey]);

  useEffect(() => {
    if (!isAnswered || showCaptureBeat) {
      setExplanationRevealed(false);
      return;
    }
    if (reducedMotion) {
      setExplanationRevealed(true);
      return;
    }
    setExplanationRevealed(false);
    const id = window.setTimeout(() => setExplanationRevealed(true), EXPLANATION_REVEAL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [isAnswered, reducedMotion, flowStepKey, showCaptureBeat]);

  const feedbackHeadline = isCorrect
    ? feedbackLine(FEEDBACK_CORRECT, flowStepKey)
    : feedbackLine(FEEDBACK_INCORRECT, `${flowStepKey}-miss`);

  const compactChoices = shouldUseCompactChoiceGrid(choices, questionText);

  return (
    <div className="quiz-immersive flex h-[100dvh] max-h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="flex min-h-[3rem] shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-2 py-1.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 [@media(max-height:700px)]:min-h-[2.75rem] [@media(max-height:700px)]:px-1.5 [@media(max-height:700px)]:py-1">
        <Button variant="ghost" size="sm" className="shrink-0 gap-0.5 px-2 text-muted-foreground" asChild>
          <Link to={quitHref} className="flex items-center font-semibold" aria-label={quitAriaLabel}>
            <ChevronLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Fermer</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <div className="flex min-w-0 items-center justify-center gap-1.5 text-xs font-bold leading-tight sm:text-sm">
            {headerCenter}
            {headerChip}
          </div>
        </div>
        {streak > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/25 bg-warning-soft/60 px-2 py-0.5 text-[10px] font-bold text-foreground sm:text-xs"
            title={streakTitle}
          >
            <span aria-hidden>🔥</span>
            <span>{streak}</span>
          </span>
        ) : null}
        <span className="shrink-0 tabular-nums text-sm font-extrabold text-foreground sm:text-base">
          {stepFraction}
        </span>
      </header>
      {progressPercent !== null ? (
        <Progress value={progressPercent} className="h-1 shrink-0 rounded-none" />
      ) : (
        <div className="h-px shrink-0 bg-border/50" aria-hidden />
      )}

      {belowProgressSlot ? (
        <div className="shrink-0 border-b border-border/40 px-3 py-2 [@media(max-height:700px)]:py-1.5">
          {belowProgressSlot}
        </div>
      ) : null}

      <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col px-3 pb-[env(safe-area-inset-bottom)] pt-2 [@media(max-height:700px)]:px-2 [@media(max-height:700px)]:pt-1">
        <div
          key={`question-${flowStepKey}`}
          className={`quiz-immersive-question shrink-0 ${shortScreen}max-h-[30vh] ${shortScreen}min-h-0 ${shortScreen}overflow-y-auto`}
        >
          <div className="animate-soft-rise rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4 [@media(max-height:700px)]:p-2.5 [@media(max-height:700px)]:rounded-xl">
            {questionSubtitle ? (
              <div className="mb-1 text-[10px] font-semibold text-muted-foreground">{questionSubtitle}</div>
            ) : null}
            <div className="flex min-w-0 items-start gap-2">
              <h1
                className={`min-w-0 flex-1 break-words font-extrabold leading-snug tracking-tight ${shortScreen}text-sm ${shortScreen}leading-tight sm:text-lg md:text-xl`}
              >
                {questionText}
              </h1>
              <Button
                onClick={onSpeakQuestion}
                variant="ghost"
                size="icon"
                aria-label="Écouter la question"
                title="Écouter la question"
                className={`size-9 shrink-0 ${shortScreen}size-8`}
              >
                <Volume2 className="size-[1.1rem] sm:size-5" />
              </Button>
            </div>
          </div>
        </div>

        <div
          key={`choices-${flowStepKey}`}
          className={
            compactChoices
              ? "grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 pb-1 pt-2 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:pt-1 [@media(max-height:700px)]:pb-0"
              : "grid min-h-0 flex-1 grid-rows-4 gap-2 pb-1 pt-2 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:pt-1 [@media(max-height:700px)]:pb-0"
          }
        >
          {choices.map((choice, idx) => {
            const isSelected = selectedIndex === idx;
            const isCorrectChoice = (choiceOrder[idx] ?? idx) === revealedCorrectIndex;

            let choiceClass =
              "quiz-answer-card border-2 border-border bg-card hover:border-primary hover:bg-primary-soft/30 shadow-sm hover:shadow-md";
            let icon: React.ReactNode = null;

            if (isAnswered) {
              if (isCorrectChoice) {
                choiceClass =
                  "quiz-answer-card quiz-answer-card--correct border-2 border-success bg-success-soft text-foreground ring-2 ring-success/25";
                icon = <CheckCircle2 className="size-5 shrink-0 text-success sm:size-6" />;
              } else if (isSelected) {
                choiceClass =
                  "quiz-answer-card quiz-answer-card--wrong border-2 border-destructive bg-destructive/10 text-foreground ring-2 ring-destructive/20";
                icon = <XCircle className="size-5 shrink-0 text-destructive sm:size-6" />;
              } else {
                choiceClass = "border-2 border-border bg-card opacity-65";
              }
            }

            const letterBadge = (
              <span
                className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${
                  compactChoices
                    ? `size-7 text-sm ${shortScreen}size-6 ${shortScreen}text-xs`
                    : `size-8 sm:size-10 sm:text-lg ${shortScreen}size-7 ${shortScreen}text-sm`
                } ${
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
            );

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectChoice(idx)}
                disabled={isAnswered || choicesDisabled}
                className={`min-h-0 min-w-0 max-w-full overflow-hidden rounded-xl text-left transition-all disabled:cursor-default ${choiceClass} ${
                  compactChoices
                    ? "flex min-h-[4.5rem] flex-col items-start justify-between gap-2 p-3 sm:min-h-[5rem] sm:p-3.5 [@media(max-height:700px)]:min-h-[3.75rem] [@media(max-height:700px)]:p-2.5"
                    : `flex items-center gap-2 px-3 py-2.5 sm:min-h-[3.25rem] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:rounded-lg [@media(max-height:700px)]:px-2.5 [@media(max-height:700px)]:py-2`
                }`}
              >
                {compactChoices ? (
                  <>
                    <div className="flex w-full items-center justify-between gap-1">
                      {letterBadge}
                      {icon ? <span className="shrink-0">{icon}</span> : null}
                    </div>
                    <span
                      className={`w-full break-words text-left ${compactAnswerTextClasses(choice)}`}
                    >
                      {choice}
                    </span>
                  </>
                ) : (
                  <>
                    {letterBadge}
                    <span
                      className={`min-h-0 min-w-0 flex-1 break-words text-left ${immersiveAnswerTextClasses(choice)}`}
                    >
                      {choice}
                    </span>
                    {icon}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {statusMessage ? (
          <div className="shrink-0 py-1 text-center text-sm text-muted-foreground">{statusMessage}</div>
        ) : null}

        {!isAnswered && footerWhenPlaying ? (
          <div className="shrink-0 pb-1 text-center [@media(max-height:700px)]:hidden">{footerWhenPlaying}</div>
        ) : null}
      </main>

      <Sheet open={sheetVisible} modal>
        <SheetContent
          side="bottom"
          hideClose
          overlayClassName="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          className="flex max-h-[min(72dvh,520px)] flex-col gap-0 rounded-t-2xl border-0 p-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">
            {isCorrect ? "Réponse correcte" : "Explication et bonne lecture"}
          </SheetTitle>
          <SheetDescription className="sr-only">{explanation}</SheetDescription>
          <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pt-3">
            <div className="mb-3 flex shrink-0 items-center justify-center">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/35" aria-hidden />
            </div>
            {showCaptureBeat ? (
              <ConceptCaptureBeat copy={captureCopy!} />
            ) : (
              <>
                <div
                  className={`flex shrink-0 items-start gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
                    isCorrect
                      ? "border-success/35 bg-success-soft/90"
                      : "border-border/70 bg-muted/35"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold sm:size-8 sm:text-sm ${
                      isCorrect
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden
                  >
                    {isCorrect ? "✓" : "·"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold leading-snug sm:text-base">{feedbackHeadline}</p>
                  </div>
                  <Button
                    onClick={onSpeakExplanation}
                    variant="ghost"
                    size="icon"
                    aria-label="Écouter l'explication"
                    title="Écouter l'explication"
                    className="size-9 shrink-0"
                  >
                    <Volume2 />
                  </Button>
                </div>
                <div
                  className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 py-2 ${
                    reducedMotion ? "" : "transition-opacity duration-200 ease-out"
                  } ${explanationRevealed ? "opacity-100" : "opacity-0"}`}
                  aria-live={explanationRevealed ? "polite" : "off"}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Le décode
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90 sm:text-base">{explanation}</p>
                </div>
              </>
            )}
            <div className="shrink-0 space-y-2 border-t border-border/60 bg-background/95 pt-3 backdrop-blur-sm">
              <Button
                onClick={() => void onPrimaryNext()}
                size="xl"
                variant="accent"
                className="w-full min-h-[52px] text-base font-extrabold shadow-[var(--shadow-card)]"
              >
                {primaryNextLabel}
                <ArrowRight />
              </Button>
              {sheetSecondaryAction ? (
                <Button
                  type="button"
                  onClick={() => void sheetSecondaryAction.onClick()}
                  size="lg"
                  variant="outline"
                  className="w-full"
                >
                  {sheetSecondaryAction.label}
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
