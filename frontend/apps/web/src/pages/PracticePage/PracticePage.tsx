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
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  ANSWER_SAVED_TEXT,
  EXIT_BUTTON_TEXT,
  EXIT_DIALOG_TITLE,
  EXIT_DIALOG_DESCRIPTION,
  EXIT_DIALOG_CONFIRM,
  EXIT_DIALOG_CANCEL,
  ERROR_SAVING_ANSWER,
} from './PracticePage.constants';
import {
  CONTAINER_STYLES,
  HEADER_STYLES,
  CONTENT_STYLES,
  FOOTER_STYLES,
  FEEDBACK_CONTAINER_STYLES,
  SUBMIT_BUTTON_STYLES,
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
    isAnswerSaved,
    setSessionData,
    setSelectedAnswer,
    setConfidenceLevel,
    setIsAnswerSaved,
    resetSession,
  } = usePracticeSessionStore();

  const setLatestResult = useResultsStore((state) => state.setLatestResult);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    showExitDialog,
    confirmNavigation,
    handleConfirmExit,
    handleCancelExit,
  } = useNavigationGuard(!!currentQuestion && !isSubmitting);

  // Timer tracking per question
  useEffect(() => {
    setTimeSpent(0);
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion?.question_id]);

  // Initial load check
  useEffect(() => {
    if (!currentQuestion) {
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
    }
  }, [currentQuestion, setSessionData, navigate]);

  const handleSubmit = async () => {
    if (!selectedAnswer || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await submitAnswer(
        selectedAnswer,
        timeSpent,
        confidenceLevel
      );

      setIsAnswerSaved(true);

      // Brief delay so student sees neutral "Answer saved ✓" message
      setTimeout(async () => {
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
      }, 600);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        setErrorMessage(err.response?.data?.detail || ERROR_SAVING_ANSWER);
      } else {
        setErrorMessage(ERROR_SAVING_ANSWER);
      }
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

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <ProgressBar
          currentPosition={currentPosition}
          totalQuestions={totalQuestions}
        />
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
        <div>
          {isAnswerSaved && (
            <div className={FEEDBACK_CONTAINER_STYLES}>
              <span>{ANSWER_SAVED_TEXT}</span>
            </div>
          )}
        </div>

        <Button
          className={SUBMIT_BUTTON_STYLES}
          disabled={!selectedAnswer || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
        </Button>
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
