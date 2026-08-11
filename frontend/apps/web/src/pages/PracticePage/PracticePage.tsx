import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Skeleton } from '@workspace/ui/components/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@workspace/ui/components/dialog';
import { ProgressBar } from '@/components/practice/ProgressBar/ProgressBar';
import { QuestionCard } from '@/components/practice/QuestionCard/QuestionCard';
import { ConfidenceSelector } from '@/components/practice/ConfidenceSelector/ConfidenceSelector';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import { useResultsStore } from '@/store/results-store';
import {
  getCurrentQuestion,
  getSessionNavigation,
  submitAnswer,
  completePractice,
} from '@/services/practice-service';
import { useNavigationGuard } from '@/hooks/use-navigation-guard';
import { ROUTES } from '@/constants/routes';
import type { ApiErrorResponse } from '@/types/api';
import {
  QUESTION_PREFIX,
  OF_TEXT,
  PREVIOUS_LABEL,
  NEXT_LABEL,
  SKIP_LABEL,
  SAVE_ANSWER_LABEL,
  UPDATE_ANSWER_LABEL,
  FINISH_TEST_LABEL,
  SUBMITTING_LABEL,
  ANSWERED_BADGE_TEXT,
  UNANSWERED_COUNT_PREFIX,
  EXIT_BUTTON_TEXT,
  EXIT_DIALOG_TITLE,
  EXIT_DIALOG_DESCRIPTION,
  EXIT_DIALOG_CONFIRM,
  EXIT_DIALOG_CANCEL,
  ERROR_SAVING_ANSWER,
  ERROR_LOADING_QUESTION,
} from './PracticePage.constants';
import {
  PAGE_STYLES,
  CONTAINER_STYLES,
  HEADER_STYLES,
  HEADER_META_STYLES,
  QUESTION_COUNTER_STYLES,
  ANSWERED_BADGE_STYLES,
  UNANSWERED_COUNT_STYLES,
  CONTENT_STYLES,
  FOOTER_STYLES,
  FOOTER_ACTIONS_STYLES,
  PREVIOUS_BUTTON_STYLES,
  SKIP_BUTTON_STYLES,
  NEXT_BUTTON_STYLES,
  EXIT_BUTTON_STYLES,
  LOADING_CONTAINER_STYLES,
  SKELETON_BAR_STYLES,
  SKELETON_CARD_STYLES,
} from './PracticePage.styles';

export function PracticePage() {
  const navigate = useNavigate();

  const {
    currentQuestion,
    currentPosition,
    totalQuestions,
    confidenceLevel,
    selectedAnswer,
    isCurrentAnswered,
    remainingCount,
    setSessionData,
    setNavigation,
    setSelectedAnswer,
    setConfidenceLevel,
    resetSession,
  } = usePracticeSessionStore();

  const setLatestResult = useResultsStore((state) => state.setLatestResult);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedInitialQuestion = useRef(false);

  const {
    showExitDialog,
    confirmNavigation,
    handleConfirmExit,
    handleCancelExit,
  } = useNavigationGuard(!!currentQuestion && !isSubmitting);

  const refreshNavigation = useCallback(async () => {
    try {
      setNavigation(await getSessionNavigation());
    } catch {
      // Navigation is an affordance-only concern; a failure here must not block
      // answering, so the previous map is kept rather than surfacing an error.
    }
  }, [setNavigation]);

  // Timer resets per question. Unlike the old review mode there is no paused
  // state — every position is live and answerable, including answered ones.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resets the per-question timer whenever the position changes
    setTimeSpent(0);
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentPosition]);

  // Initial load — guarded by a ref (not derived from currentQuestion) so that
  // resetSession() nulling currentQuestion out after a completed session doesn't
  // re-trigger a fetch against a session that no longer exists.
  useEffect(() => {
    if (currentQuestion || hasFetchedInitialQuestion.current) {
      return;
    }

    hasFetchedInitialQuestion.current = true;
    setIsLoading(true);
    getCurrentQuestion()
      .then((data) => {
        setSessionData(data.question, data.current_position, data.total_questions, {
          isAnswered: data.is_answered ?? false,
          selectedAnswer: data.selected_answer ?? null,
          confidenceLevel: data.confidence_level ?? null,
        });
        return refreshNavigation();
      })
      .catch(() => {
        navigate(ROUTES.DASHBOARD);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentQuestion, setSessionData, refreshNavigation, navigate]);

  const goToPosition = async (position: number) => {
    if (position < 1 || position > totalQuestions || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const data = await getCurrentQuestion(position);
      setSessionData(data.question, data.current_position, data.total_questions, {
        isAnswered: data.is_answered ?? false,
        selectedAnswer: data.selected_answer ?? null,
        confidenceLevel: data.confidence_level ?? null,
      });
    } catch {
      setErrorMessage(ERROR_LOADING_QUESTION);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const completeData = await completePractice();
      setLatestResult(completeData);
      resetSession();
      navigate(ROUTES.RESULTS);
    } catch {
      setErrorMessage(ERROR_SAVING_ANSWER);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAnswer || isSubmitting || !currentQuestion) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // The position is sent explicitly: after a skip or a step backwards the
      // question on screen is not the session's earliest unanswered one.
      await submitAnswer(selectedAnswer, timeSpent, confidenceLevel, currentPosition);
      const navigationState = await getSessionNavigation();
      setNavigation(navigationState);

      if (currentPosition < totalQuestions) {
        const data = await getCurrentQuestion(currentPosition + 1);
        setSessionData(data.question, data.current_position, data.total_questions, {
          isAnswered: data.is_answered ?? false,
          selectedAnswer: data.selected_answer ?? null,
          confidenceLevel: data.confidence_level ?? null,
        });
      } else {
        // Answering the last question leaves the student parked here; finishing
        // stays an explicit action so they can still go back and revise.
        setSessionData(currentQuestion, currentPosition, totalQuestions, {
          isAnswered: true,
          selectedAnswer,
          confidenceLevel,
        });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        setErrorMessage(err.response?.data?.detail || ERROR_SAVING_ANSWER);
      } else {
        setErrorMessage(ERROR_SAVING_ANSWER);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitClick = () => {
    confirmNavigation(() => {
      resetSession();
      navigate(ROUTES.DASHBOARD);
    });
  };

  if (isLoading) {
    return (
      <div className={LOADING_CONTAINER_STYLES}>
        <Skeleton className={SKELETON_BAR_STYLES} />
        <Skeleton className={SKELETON_CARD_STYLES} />
        <Skeleton className={SKELETON_BAR_STYLES} />
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const canGoPrevious = currentPosition > 1;
  const canGoForward = currentPosition < totalQuestions;
  const canFinish = remainingCount === 0;

  return (
    <div className={PAGE_STYLES}>
      <ProgressBar currentPosition={currentPosition} totalQuestions={totalQuestions} />

      <div className={CONTAINER_STYLES}>
        <div className={HEADER_STYLES}>
          <div className={HEADER_META_STYLES}>
            <span className={QUESTION_COUNTER_STYLES}>
              {QUESTION_PREFIX}
              {currentPosition}
              {OF_TEXT}
              {totalQuestions}
            </span>
            {isCurrentAnswered && (
              <span className={ANSWERED_BADGE_STYLES}>{ANSWERED_BADGE_TEXT}</span>
            )}
            {remainingCount > 0 && (
              <span className={UNANSWERED_COUNT_STYLES}>
                {UNANSWERED_COUNT_PREFIX}
                {remainingCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={EXIT_BUTTON_STYLES}
            onClick={handleExitClick}
          >
            {EXIT_BUTTON_TEXT}
          </Button>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className={CONTENT_STYLES}>
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={setSelectedAnswer}
            disabled={isSubmitting}
          />

          <ConfidenceSelector
            confidenceLevel={confidenceLevel}
            onSelectConfidence={setConfidenceLevel}
            disabled={isSubmitting}
          />
        </div>

        <div className={FOOTER_STYLES}>
          <Button
            variant="ghost"
            className={PREVIOUS_BUTTON_STYLES}
            disabled={!canGoPrevious || isSubmitting}
            onClick={() => goToPosition(currentPosition - 1)}
          >
            {PREVIOUS_LABEL}
          </Button>

          <div className={FOOTER_ACTIONS_STYLES}>
            <Button
              variant="ghost"
              className={SKIP_BUTTON_STYLES}
              disabled={!canGoForward || isSubmitting}
              onClick={() => goToPosition(currentPosition + 1)}
            >
              {isCurrentAnswered ? NEXT_LABEL : SKIP_LABEL}
            </Button>

            {canFinish ? (
              <Button
                className={NEXT_BUTTON_STYLES}
                disabled={isSubmitting}
                onClick={handleComplete}
              >
                {isSubmitting ? SUBMITTING_LABEL : FINISH_TEST_LABEL}
              </Button>
            ) : (
              <Button
                className={NEXT_BUTTON_STYLES}
                disabled={!selectedAnswer || isSubmitting}
                onClick={handleSave}
              >
                {isSubmitting
                  ? SUBMITTING_LABEL
                  : isCurrentAnswered
                    ? UPDATE_ANSWER_LABEL
                    : SAVE_ANSWER_LABEL}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showExitDialog} onOpenChange={handleCancelExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{EXIT_DIALOG_TITLE}</DialogTitle>
            <DialogDescription>{EXIT_DIALOG_DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelExit}>
              {EXIT_DIALOG_CANCEL}
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              {EXIT_DIALOG_CONFIRM}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
