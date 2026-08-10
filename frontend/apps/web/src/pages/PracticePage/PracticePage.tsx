import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertTitle, AlertDescription } from '@workspace/ui/components/alert';
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
  submitAnswer,
  completePractice,
  updateAttempt,
} from '@/services/practice-service';
import { useNavigationGuard } from '@/hooks/use-navigation-guard';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import type { ApiErrorResponse } from '@/types/api';
import {
  QUESTION_PREFIX,
  OF_TEXT,
  PREVIOUS_LABEL,
  NEXT_LABEL,
  NEXT_QUESTION_LABEL,
  FINISH_TEST_LABEL,
  SUBMITTING_LABEL,
  SKIP_LABEL,
  EXIT_BUTTON_TEXT,
  EXIT_DIALOG_TITLE,
  EXIT_DIALOG_DESCRIPTION,
  EXIT_DIALOG_CONFIRM,
  EXIT_DIALOG_CANCEL,
  ERROR_SAVING_ANSWER,
  RESUME_ERROR_TITLE,
  RESUME_ERROR_DESCRIPTION,
  RESUME_RETRY_LABEL,
} from './PracticePage.constants';
import {
  PAGE_STYLES,
  CONTAINER_STYLES,
  HEADER_STYLES,
  QUESTION_COUNTER_STYLES,
  TIMER_STYLES,
  CONTENT_STYLES,
  FOOTER_STYLES,
  PREVIOUS_BUTTON_STYLES,
  NEXT_BUTTON_STYLES,
  SKIP_BUTTON_STYLES,
  EXIT_BUTTON_STYLES,
  LOADING_CONTAINER_STYLES,
  SKELETON_BAR_STYLES,
  SKELETON_CARD_STYLES,
  RESUME_ERROR_CONTAINER_STYLES,
  RESUME_RETRY_BUTTON_STYLES,
} from './PracticePage.styles';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PracticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    currentQuestion,
    currentPosition,
    totalQuestions,
    confidenceLevel,
    selectedAnswer,
    answeredHistory,
    reviewIndex,
    setSessionData,
    setSelectedAnswer,
    setConfidenceLevel,
    pushAnsweredQuestion,
    updateAnsweredQuestion,
    setReviewIndex,
    resetSession,
  } = usePracticeSessionStore();

  const setLatestResult = useResultsStore((state) => state.setLatestResult);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [resumeError, setResumeError] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedInitialQuestion = useRef(false);

  const isReviewing = reviewIndex !== null;
  const reviewEntry = isReviewing ? answeredHistory[reviewIndex] : null;

  const {
    showExitDialog,
    confirmNavigation,
    handleConfirmExit,
    handleCancelExit,
  } = useNavigationGuard(!!currentQuestion && !isSubmitting);

  // Timer tracking per question — paused while reviewing a past answer.
  useEffect(() => {
    if (isReviewing) {
      return undefined;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resets the per-question timer whenever currentQuestion changes
    setTimeSpent(0);
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion?.question_id, isReviewing]);

  // Loads (or resumes) the active session's current question. Only a
  // confirmed "no active session" response (404) is treated as a reason to
  // leave — a page refresh, a flaky connection, or a browser coming back
  // from sleep must never bounce the student off an in-progress test, since
  // the session itself lives on the server and is still there.
  const loadCurrentQuestion = useCallback(() => {
    setIsLoading(true);
    setResumeError(false);

    getCurrentQuestion()
      .then((data) => {
        setSessionData(data.question, data.current_position, data.total_questions);
      })
      .catch((err: unknown) => {
        const confirmedNoActiveSession =
          axios.isAxiosError<ApiErrorResponse>(err) && err.response?.status === 404;

        if (confirmedNoActiveSession) {
          navigate(ROUTES.DASHBOARD);
        } else {
          setResumeError(true);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [setSessionData, navigate]);

  // Guarded by a ref (not derived from currentQuestion) so that
  // resetSession() nulling currentQuestion out after a completed session
  // doesn't re-trigger a fetch against a session that no longer exists,
  // racing with the navigate-to-results that just happened.
  useEffect(() => {
    if (currentQuestion || hasFetchedInitialQuestion.current) {
      return;
    }

    hasFetchedInitialQuestion.current = true;
    loadCurrentQuestion();
  }, [currentQuestion, loadCurrentQuestion]);

  const advanceAfterSubmit = async (remainingQuestions: number) => {
    if (remainingQuestions > 0) {
      try {
        const nextQuestionData = await getCurrentQuestion();
        setSessionData(
          nextQuestionData.question,
          nextQuestionData.current_position,
          nextQuestionData.total_questions
        );
      } catch {
        setErrorMessage(ERROR_SAVING_ANSWER);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const completeData = await completePractice();
        setLatestResult(completeData);
        // Completing a session changes dashboard metrics (questions answered,
        // sessions completed, estimated score) — invalidate so the dashboard
        // refetches instead of serving its pre-session cache on next visit.
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        resetSession();
        navigate(ROUTES.RESULTS);
      } catch {
        setErrorMessage(ERROR_SAVING_ANSWER);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || isSubmitting || !currentQuestion) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await submitAnswer(selectedAnswer, timeSpent, confidenceLevel);

      pushAnsweredQuestion({
        position: currentPosition,
        question: currentQuestion,
        selectedAnswer,
        confidenceLevel,
        attemptId: response.attempt_id,
      });

      await advanceAfterSubmit(response.remaining_questions);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        setErrorMessage(err.response?.data?.detail || ERROR_SAVING_ANSWER);
      } else {
        setErrorMessage(ERROR_SAVING_ANSWER);
      }
    }
  };

  const handleSkip = async () => {
    if (isSubmitting || !currentQuestion) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await submitAnswer(null, timeSpent, confidenceLevel);

      pushAnsweredQuestion({
        position: currentPosition,
        question: currentQuestion,
        selectedAnswer: null,
        confidenceLevel,
        attemptId: response.attempt_id,
      });

      await advanceAfterSubmit(response.remaining_questions);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        setErrorMessage(err.response?.data?.detail || ERROR_SAVING_ANSWER);
      } else {
        setErrorMessage(ERROR_SAVING_ANSWER);
      }
    }
  };

  const handleReviewAnswerChange = async (newAnswer: string) => {
    if (!reviewEntry || isSubmitting) return;

    setErrorMessage(null);

    try {
      await updateAttempt(reviewEntry.attemptId, newAnswer);
      updateAnsweredQuestion(reviewEntry.position, newAnswer);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        setErrorMessage(err.response?.data?.detail || ERROR_SAVING_ANSWER);
      } else {
        setErrorMessage(ERROR_SAVING_ANSWER);
      }
    }
  };

  const handlePrevious = () => {
    if (isReviewing) {
      if (reviewIndex! > 0) {
        setReviewIndex(reviewIndex! - 1);
      }
      return;
    }

    if (answeredHistory.length > 0) {
      setReviewIndex(answeredHistory.length - 1);
    }
  };

  const handleNextInReview = () => {
    if (reviewIndex === null) return;

    if (reviewIndex >= answeredHistory.length - 1) {
      setReviewIndex(null);
    } else {
      setReviewIndex(reviewIndex + 1);
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

  if (resumeError) {
    return (
      <div className={RESUME_ERROR_CONTAINER_STYLES}>
        <Alert variant="destructive">
          <AlertTitle>{RESUME_ERROR_TITLE}</AlertTitle>
          <AlertDescription>
            {RESUME_ERROR_DESCRIPTION}
            <div>
              <Button
                size="sm"
                className={RESUME_RETRY_BUTTON_STYLES}
                onClick={loadCurrentQuestion}
              >
                {RESUME_RETRY_LABEL}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const displayedQuestion = isReviewing ? reviewEntry!.question : currentQuestion;
  const displayedSelectedAnswer = isReviewing ? reviewEntry!.selectedAnswer : selectedAnswer;
  const displayedConfidence = isReviewing ? reviewEntry!.confidenceLevel : confidenceLevel;
  const displayedPosition = isReviewing ? reviewEntry!.position : currentPosition;
  const isLastQuestion = currentPosition === totalQuestions;
  const canGoPrevious = isReviewing ? reviewIndex! > 0 : answeredHistory.length > 0;

  return (
    <div className={PAGE_STYLES}>
      <ProgressBar currentPosition={displayedPosition} totalQuestions={totalQuestions} />

      <div className={CONTAINER_STYLES}>
        <div className={HEADER_STYLES}>
          <span className={QUESTION_COUNTER_STYLES}>
            {QUESTION_PREFIX}
            {displayedPosition}
            {OF_TEXT}
            {totalQuestions}
          </span>
          {!isReviewing && (
            <span className={TIMER_STYLES}>{formatTime(timeSpent)}</span>
          )}
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
            question={displayedQuestion}
            selectedAnswer={displayedSelectedAnswer}
            onSelectAnswer={isReviewing ? handleReviewAnswerChange : setSelectedAnswer}
            disabled={isSubmitting}
          />

          <ConfidenceSelector
            confidenceLevel={displayedConfidence}
            onSelectConfidence={setConfidenceLevel}
            disabled={isReviewing || isSubmitting}
          />
        </div>

        <div className={FOOTER_STYLES}>
          <Button
            variant="ghost"
            className={PREVIOUS_BUTTON_STYLES}
            disabled={!canGoPrevious}
            onClick={handlePrevious}
          >
            {PREVIOUS_LABEL}
          </Button>

          {isReviewing ? (
            <Button className={NEXT_BUTTON_STYLES} onClick={handleNextInReview}>
              {NEXT_LABEL}
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                className={SKIP_BUTTON_STYLES}
                disabled={isSubmitting}
                onClick={handleSkip}
              >
                {SKIP_LABEL}
              </Button>
              <Button
                className={NEXT_BUTTON_STYLES}
                disabled={!selectedAnswer || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? SUBMITTING_LABEL
                  : isLastQuestion
                    ? FINISH_TEST_LABEL
                    : NEXT_QUESTION_LABEL}
              </Button>
            </div>
          )}
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
