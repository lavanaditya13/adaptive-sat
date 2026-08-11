import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { QuestionCard } from '@/components/practice/QuestionCard/QuestionCard';
import { ConfidenceSelector } from '@/components/practice/ConfidenceSelector/ConfidenceSelector';
import { SessionHeader } from '@/components/practice/SessionHeader/SessionHeader';
import { QuestionNavPanel } from '@/components/practice/QuestionNavPanel/QuestionNavPanel';
import { getPracticeAccent } from '@/constants/practice-visuals';
import { ROUTES } from '@/constants/routes';
import { useAppShellStore } from '@/store/app-shell-store';
import { useResultsStore } from '@/store/results-store';
import { useQuestionSession } from './use-question-session';
import {
  buildQuestionPill,
  CHANGED_PREFIX,
  CHANGED_SUFFIX,
  DEFAULT_CONFIDENCE,
  FINISH_LABEL,
  formatClock,
  LOADING_LABEL,
  NEXT_LABEL,
  NEXT_REVIEW_LABEL,
  PREVIOUS_LABEL,
  RETRY_LABEL,
  REVIEW_BANNER_TEXT,
  SESSION_ENDED_MESSAGE,
  SESSION_ENDED_TITLE,
  SKIP_LABEL,
  TOTAL_SUFFIX,
} from './QuestionsPage.constants';
import {
  CHANGED_PILL_STYLES,
  CHANGED_PILL_TEXT_STYLES,
  CONTAINER_STYLES,
  FOOTER_ACTIONS_STYLES,
  FOOTER_ROW_STYLES,
  HEADER_ROW_STYLES,
  NEXT_BUTTON_STYLES,
  PREV_BUTTON_STYLES,
  REVIEW_BANNER_STYLES,
  REVIEW_BANNER_TEXT_STYLES,
  SKIP_BUTTON_STYLES,
  SPACER_STYLES,
  STATE_MESSAGE_STYLES,
  STATE_PANEL_STYLES,
  STATE_TITLE_STYLES,
} from './QuestionsPage.styles';

export function QuestionsPage() {
  const navigate = useNavigate();
  const setTrailingCrumbLabel = useAppShellStore((state) => state.setTrailingCrumbLabel);
  const setLatestResult = useResultsStore((state) => state.setLatestResult);
  const [navOpen, setNavOpen] = useState(false);

  const {
    slots,
    current,
    currentPosition,
    totalQuestions,
    sessionSeconds,
    isLoading,
    isBusy,
    loadError,
    sessionEnded,
    selectAnswer,
    selectConfidence,
    goToPosition,
    goNext,
    goPrevious,
    skip,
    finish,
    retryLoad,
  } = useQuestionSession();

  const question = current?.question ?? null;

  // The session target isn't in the URL, so the breadcrumb can't derive it.
  useEffect(() => {
    if (question) {
      setTrailingCrumbLabel(question.topic_display_name);
    }

    return () => setTrailingCrumbLabel(null);
  }, [question, setTrailingCrumbLabel]);

  const handleFinish = async () => {
    const result = await finish();
    if (result) {
      setLatestResult(result);
      navigate(ROUTES.RESULTS);
    }
  };

  if (isLoading) {
    return (
      <div className={STATE_PANEL_STYLES}>
        <p className={STATE_TITLE_STYLES}>{LOADING_LABEL}</p>
      </div>
    );
  }

  if (sessionEnded || (!question && !loadError)) {
    return (
      <div className={STATE_PANEL_STYLES}>
        <p className={STATE_TITLE_STYLES}>{SESSION_ENDED_TITLE}</p>
        <p className={STATE_MESSAGE_STYLES}>{SESSION_ENDED_MESSAGE}</p>
        <Button className="mt-4" onClick={handleFinish} disabled={isBusy}>
          {FINISH_LABEL}
        </Button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className={STATE_PANEL_STYLES}>
        <p className={STATE_TITLE_STYLES}>{loadError}</p>
        <Button className="mt-4" onClick={() => void retryLoad()}>
          {RETRY_LABEL}
        </Button>
      </div>
    );
  }

  const accent = getPracticeAccent(question.section);
  const isLastQuestion = totalQuestions > 0 && currentPosition >= totalQuestions;
  // "Reviewing" means this slot was already committed to the server — the student
  // is revisiting it rather than answering it for the first time.
  const isReviewing = Boolean(current?.answered);
  const showChangedPill =
    isReviewing &&
    current?.firstSubmittedAnswer != null &&
    current.selectedAnswer !== current.firstSubmittedAnswer;
  const canAdvance = isReviewing || current?.selectedAnswer != null;

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <SessionHeader
          questionLabel={buildQuestionPill(currentPosition)}
          questionTime={formatClock(current?.timeSpentSeconds ?? 0)}
          sessionTime={formatClock(sessionSeconds)}
          totalSuffix={TOTAL_SUFFIX}
          accentText={accent.text}
          accentBorder={accent.border}
          accentTint={accent.tint}
          accentDot={accent.solid}
          onOpenNav={() => setNavOpen(true)}
        />
      </div>

      {isReviewing && (
        <div className={REVIEW_BANNER_STYLES}>
          <RotateCcw className="size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span className={REVIEW_BANNER_TEXT_STYLES}>{REVIEW_BANNER_TEXT}</span>
        </div>
      )}

      {navOpen && (
        <QuestionNavPanel
          items={slots.map((slot) => ({
            position: slot.position,
            answered: slot.answered,
            skipped: slot.skipped,
            seen: slot.question !== null,
          }))}
          currentPosition={currentPosition}
          accentSolid={accent.solid}
          accentRing={accent.border}
          onSelect={(position) => {
            setNavOpen(false);
            void goToPosition(position);
          }}
          onClose={() => setNavOpen(false)}
        />
      )}

      <QuestionCard
        question={question}
        selectedAnswer={current?.selectedAnswer ?? null}
        onSelectAnswer={selectAnswer}
        disabled={isBusy}
      />

      {showChangedPill && (
        <div className={CHANGED_PILL_STYLES}>
          <span className={CHANGED_PILL_TEXT_STYLES}>
            {CHANGED_PREFIX}
            {current?.firstSubmittedAnswer}
            {CHANGED_SUFFIX}
          </span>
        </div>
      )}

      <div className={SPACER_STYLES}>
        <ConfidenceSelector
          confidenceLevel={current?.confidence ?? DEFAULT_CONFIDENCE}
          onSelectConfidence={selectConfidence}
          disabled={isBusy || isReviewing}
        />
      </div>

      <div className={FOOTER_ROW_STYLES}>
        <button
          type="button"
          className={PREV_BUTTON_STYLES}
          onClick={() => void goPrevious()}
          disabled={currentPosition <= 1 || isBusy}
        >
          <ArrowLeft className="size-[15px]" aria-hidden="true" />
          {PREVIOUS_LABEL}
        </button>

        <div className={FOOTER_ACTIONS_STYLES}>
          {!isReviewing && !isLastQuestion && (
            <button
              type="button"
              className={SKIP_BUTTON_STYLES}
              onClick={() => void skip()}
              disabled={isBusy}
            >
              {SKIP_LABEL}
            </button>
          )}

          <button
            type="button"
            className={`${NEXT_BUTTON_STYLES} ${accent.button}`}
            onClick={() => (isLastQuestion ? void handleFinish() : void goNext())}
            disabled={!canAdvance || isBusy}
          >
            {isLastQuestion ? FINISH_LABEL : isReviewing ? NEXT_REVIEW_LABEL : NEXT_LABEL}
            {!isLastQuestion && <ArrowRight className="size-[15px]" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
