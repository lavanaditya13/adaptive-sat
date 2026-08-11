import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { DEFAULT_CONFIDENCE } from '@/components/practice/ConfidenceSelector/ConfidenceSelector.constants';
import type { SegmentState } from '@/components/practice/ProgressBar/ProgressBar.constants';
import type { NavItem, NavItemState } from '@/components/practice/QuestionNavPanel/QuestionNavPanel.constants';
import {
  FINISH_TEST_LABEL,
  NEXT_LABEL,
  NEXT_QUESTION_LABEL,
} from '@/components/practice/SessionNavigation/SessionNavigation.constants';
import { getSessionAccent } from '@/components/practice/session-accent';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import {
  abandonPractice,
  completePractice,
  getCurrentQuestion,
  submitAnswer,
} from '@/services/practice-service';
import { useAppShellStore } from '@/store/app-shell-store';
import { useResultsStore } from '@/store/results-store';
import type { ApiErrorResponse, Question } from '@/types/api';
import {
  ERROR_COMPLETING_SESSION,
  ERROR_SAVING_ANSWER,
  NO_ACTIVE_SESSION_STATUS,
  NO_SESSION_TOAST,
  SESSION_ENDED_TOAST,
} from './QuestionsPage.constants';

/** One question the student has already sent to the backend. Attempts are
 *  immutable server-side, so these entries are read-only once recorded. */
interface SubmittedAnswer {
  position: number;
  question: Question;
  selectedAnswer: string | null;
  confidence: number;
  timeSpentSeconds: number;
  skipped: boolean;
}

export type SessionStatus = 'loading' | 'ready' | 'resume-error';

export function useQuestionSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setLatestResult = useResultsStore((state) => state.setLatestResult);
  const showToast = useAppShellStore((state) => state.showToast);
  const isMobile = useAppShellStore((state) => state.isMobile);

  const [status, setStatus] = useState<SessionStatus>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [viewPosition, setViewPosition] = useState(0);
  const [furthestPosition, setFurthestPosition] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(DEFAULT_CONFIDENCE);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Latched independently of `isSubmitting` state so two clicks landing in the
   *  same tick can't both reach POST /answer. */
  const submittingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const isReviewing = viewPosition > 0 && viewPosition < currentPosition;

  const applyQuestion = useCallback((next: Question, position: number, total: number) => {
    setQuestion(next);
    setCurrentPosition(position);
    setTotalQuestions(total);
    setViewPosition(position);
    setFurthestPosition((previous) => Math.max(previous, position));
    setSelectedAnswer(null);
    setConfidence(DEFAULT_CONFIDENCE);
    setQuestionSeconds(0);
    setStatus('ready');
  }, []);

  const finishSession = useCallback(async () => {
    try {
      const result = await completePractice();
      setLatestResult(result);
      // Completing a session moves dashboard metrics (questions answered,
      // sessions completed, estimated score) — drop the pre-session cache.
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      setIsLeaving(true);
      setQuestion(null);
      navigate(ROUTES.RESULTS);
    } catch {
      setErrorMessage(ERROR_COMPLETING_SESSION);
    }
  }, [navigate, queryClient, setLatestResult]);

  /** Loads (or resumes) the active session's current question. Only a
   *  confirmed 404 means "no active session" — a refresh, a flaky connection
   *  or a laptop waking from sleep must never bounce a student off a session
   *  that still exists on the server. */
  const loadSession = useCallback(() => {
    setStatus('loading');
    setErrorMessage(null);

    getCurrentQuestion()
      .then((data) => {
        if (!data.question) {
          // Every question is already answered — the session is ready to complete.
          return finishSession();
        }

        applyQuestion(data.question, data.current_position, data.total_questions);
        return undefined;
      })
      .catch((error: unknown) => {
        const confirmedNoActiveSession =
          axios.isAxiosError<ApiErrorResponse>(error) &&
          error.response?.status === NO_ACTIVE_SESSION_STATUS;

        if (confirmedNoActiveSession) {
          setIsLeaving(true);
          showToast(NO_SESSION_TOAST);
          navigate(ROUTES.DASHBOARD);
          return;
        }

        setStatus('resume-error');
      });
  }, [applyQuestion, finishSession, navigate, showToast]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    loadSession();
  }, [loadSession]);

  // One interval for the whole runner, torn down whenever the clock should
  // stop — paused, reviewing a past question, loading, or already finished.
  const isTicking = status === 'ready' && !isPaused && !isReviewing && question !== null;

  useEffect(() => {
    if (!isTicking) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSessionSeconds((previous) => previous + 1);
      setQuestionSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTicking]);

  const submitAndAdvance = useCallback(
    async (answer: string | null, skipped: boolean) => {
      if (submittingRef.current || !question || status !== 'ready') {
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      const answeredPosition = currentPosition;
      const answeredQuestion = question;
      const spent = questionSeconds;
      const rating = confidence;

      try {
        const response = await submitAnswer(answer, spent, rating);

        setAnswers((previous) => [
          ...previous.filter((entry) => entry.position !== answeredPosition),
          {
            position: answeredPosition,
            question: answeredQuestion,
            selectedAnswer: answer,
            confidence: rating,
            timeSpentSeconds: spent,
            skipped,
          },
        ]);

        if (response.remaining_questions > 0) {
          const next = await getCurrentQuestion();

          if (!next.question) {
            await finishSession();
            return;
          }

          applyQuestion(next.question, next.current_position, next.total_questions);
          return;
        }

        await finishSession();
      } catch (error: unknown) {
        const detail = axios.isAxiosError<ApiErrorResponse>(error)
          ? error.response?.data?.detail
          : undefined;
        setErrorMessage(detail || ERROR_SAVING_ANSWER);
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [applyQuestion, confidence, currentPosition, finishSession, question, questionSeconds, status]
  );

  const goPrevious = useCallback(() => {
    setViewPosition((previous) => Math.max(1, previous - 1));
  }, []);

  const goNext = useCallback(() => {
    if (isReviewing) {
      setViewPosition((previous) => Math.min(previous + 1, currentPosition));
      return;
    }

    void submitAndAdvance(selectedAnswer, false);
  }, [currentPosition, isReviewing, selectedAnswer, submitAndAdvance]);

  const skipQuestion = useCallback(() => {
    void submitAndAdvance(null, true);
  }, [submitAndAdvance]);

  /** Questions past the live one aren't fetchable — the backend hands them out
   *  strictly in order — so jumping is clamped to what's already been seen. */
  const jumpToQuestion = useCallback(
    (position: number) => {
      if (position < 1 || position > currentPosition) {
        return;
      }

      setViewPosition(position);
      setFurthestPosition((previous) => Math.max(previous, position));
      setIsNavOpen(false);
    },
    [currentPosition]
  );

  const endSession = useCallback(async () => {
    setIsLeaving(true);

    try {
      await abandonPractice();
    } finally {
      showToast(SESSION_ENDED_TOAST);
      navigate(ROUTES.DASHBOARD);
    }
  }, [navigate, showToast]);

  const viewedAnswer = useMemo(
    () => answers.find((entry) => entry.position === viewPosition) ?? null,
    [answers, viewPosition]
  );

  const displayedQuestion = isReviewing && viewedAnswer ? viewedAnswer.question : question;

  const segments = useMemo<SegmentState[]>(
    () =>
      Array.from({ length: totalQuestions }, (_, index) => {
        const entry = answers.find((item) => item.position === index + 1);

        if (!entry) {
          return 'upcoming';
        }

        return entry.skipped ? 'skipped' : 'answered';
      }),
    [answers, totalQuestions]
  );

  const navItems = useMemo<NavItem[]>(
    () =>
      Array.from({ length: totalQuestions }, (_, index) => {
        const position = index + 1;
        const entry = answers.find((item) => item.position === position);
        let state: NavItemState = 'locked';

        if (entry) {
          state = entry.skipped ? 'skipped' : 'answered';
        } else if (position <= currentPosition) {
          state = 'unanswered';
        }

        return { position, state, isCurrent: position === viewPosition };
      }),
    [answers, currentPosition, totalQuestions, viewPosition]
  );

  return {
    status,
    errorMessage,
    isMobile,
    isPaused,
    isNavOpen,
    isReviewing,
    isSubmitting,
    /** True while a session is genuinely in progress — drives the exit guard. */
    hasActiveSession: !isLeaving && displayedQuestion !== null,

    question: displayedQuestion,
    accent: getSessionAccent(displayedQuestion?.section),
    selectedAnswer: isReviewing && viewedAnswer ? viewedAnswer.selectedAnswer : selectedAnswer,
    confidence: isReviewing && viewedAnswer ? viewedAnswer.confidence : confidence,
    questionSeconds: isReviewing && viewedAnswer ? viewedAnswer.timeSpentSeconds : questionSeconds,
    sessionSeconds,

    viewPosition,
    currentPosition,
    totalQuestions,
    furthestPosition,
    segments,
    navItems,

    canGoNext: isReviewing || selectedAnswer !== null,
    hasPrevious: viewPosition > 1,
    showSkip: !isReviewing,
    nextLabel: isReviewing
      ? NEXT_LABEL
      : currentPosition === totalQuestions
        ? FINISH_TEST_LABEL
        : NEXT_QUESTION_LABEL,

    selectAnswer: setSelectedAnswer,
    selectConfidence: setConfidence,
    goPrevious,
    goNext,
    skipQuestion,
    jumpToQuestion,
    openNav: () => setIsNavOpen(true),
    closeNav: () => setIsNavOpen(false),
    togglePause: () => setIsPaused((previous) => !previous),
    retryLoad: loadSession,
    endSession,
  };
}
