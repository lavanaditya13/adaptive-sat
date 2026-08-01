import { useEffect, useState, useRef } from 'react';
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
  NEXT_QUESTION_LABEL,
  FINISH_TEST_LABEL,
  SUBMITTING_LABEL,
  EXIT_BUTTON_TEXT,
  EXIT_DIALOG_TITLE,
  EXIT_DIALOG_DESCRIPTION,
  EXIT_DIALOG_CONFIRM,
  EXIT_DIALOG_CANCEL,
  ERROR_SAVING_ANSWER,
} from './PracticePage.constants';
import {
  PAGE_STYLES,
  CONTAINER_STYLES,
  HEADER_STYLES,
  QUESTION_COUNTER_STYLES,
  CONTENT_STYLES,
  FOOTER_STYLES,
  PREVIOUS_BUTTON_STYLES,
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
    answeredHistory,
    reviewIndex,
    setSessionData,
    setSelectedAnswer,
    setConfidenceLevel,
    pushAnsweredQuestion,
    setReviewIndex,
    resetSession,
  } = usePracticeSessionStore();

  const setLatestResult = useResultsStore((state) => state.setLatestResult);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

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

    setTimeSpent(0);
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion?.question_id, isReviewing]);

  // Initial load check — guarded by a ref (not derived from currentQuestion)
  // so that resetSession() nulling currentQuestion out after a completed
  // session doesn't re-trigger a fetch against a session that no longer
  // exists, racing with the navigate-to-results that just happened.
  useEffect(() => {
    if (currentQuestion || hasFetchedInitialQuestion.current) {
      return;
    }

    hasFetchedInitialQuestion.current = true;
    setIsLoading(true);
    getCurrentQuestion()
      .then((data) => {
        setSessionData(data.question, data.current_position, data.total_questions);
      })
      .catch(() => {
        navigate(ROUTES.DASHBOARD);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentQuestion, setSessionData, navigate]);

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
      });

      if (response.remaining_questions > 0) {
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
          resetSession();
          navigate(ROUTES.RESULTS);
        } catch {
          setErrorMessage(ERROR_SAVING_ANSWER);
        } finally {
          setIsSubmitting(false);
        }
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
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
            onSelectAnswer={setSelectedAnswer}
            disabled={isReviewing || isSubmitting}
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
