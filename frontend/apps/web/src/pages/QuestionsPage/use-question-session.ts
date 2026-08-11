import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completePractice,
  getCurrentQuestion,
  submitAnswer,
  updateAttempt,
} from '@/services/practice-service';
import type { CompleteResponse, Question } from '@/types/api';
import { DEFAULT_CONFIDENCE } from './QuestionsPage.constants';

/** One slot per position in the session.
 *
 *  `question` is cached the first time a position is served because the backend
 *  cannot serve it again: GET /practice/question?questionId=<position> returns 400
 *  once that position has been answered. Everything the review UI shows for an
 *  answered question therefore comes from here, not from a refetch. */
export interface SessionSlot {
  position: number;
  question: Question | null;
  selectedAnswer: string | null;
  /** First answer committed to the server, so "changed from your original" is
   *  about what the server holds rather than local keystrokes. */
  firstSubmittedAnswer: string | null;
  confidence: number;
  timeSpentSeconds: number;
  attemptId: number | null;
  answered: boolean;
  /** Moved past without answering. The position stays ASSIGNED server-side, which
   *  is what makes coming back to it possible at all. */
  skipped: boolean;
}

function emptySlot(position: number): SessionSlot {
  return {
    position,
    question: null,
    selectedAnswer: null,
    firstSubmittedAnswer: null,
    confidence: DEFAULT_CONFIDENCE,
    timeSpentSeconds: 0,
    attemptId: null,
    answered: false,
    skipped: false,
  };
}

interface UseQuestionSessionResult {
  slots: SessionSlot[];
  currentPosition: number;
  current: SessionSlot | undefined;
  totalQuestions: number;
  sessionSeconds: number;
  isLoading: boolean;
  isBusy: boolean;
  loadError: string | null;
  sessionEnded: boolean;
  selectAnswer: (answer: string) => void;
  selectConfidence: (level: number) => void;
  goToPosition: (position: number) => Promise<void>;
  goNext: () => Promise<void>;
  goPrevious: () => Promise<void>;
  skip: () => Promise<void>;
  finish: () => Promise<CompleteResponse | null>;
  retryLoad: () => Promise<void>;
}

export function useQuestionSession(): UseQuestionSessionResult {
  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [currentPosition, setCurrentPosition] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  /* The one-second tick and the async navigation helpers both need the position
     that is current *when they run*, not the one captured when they were created. */
  const positionRef = useRef(currentPosition);
  useEffect(() => {
    positionRef.current = currentPosition;
  }, [currentPosition]);

  const applyServed = useCallback((position: number, question: Question, total: number) => {
    setTotalQuestions((prev) => (total > 0 ? total : prev));
    setSlots((prev) => {
      const size = Math.max(total, prev.length, position);
      const next = Array.from({ length: size }, (_, i) => prev[i] ?? emptySlot(i + 1));
      next[position - 1] = { ...next[position - 1], question };
      return next;
    });
    setCurrentPosition(position);
  }, []);

  const fetchSession = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const response = await getCurrentQuestion();
      if (isCancelled()) {
        return;
      }
      if (!response.question || response.current_position === null) {
        // Every question is answered — the session is only waiting to be completed.
        setSessionEnded(true);
        setTotalQuestions(response.total_questions);
        return;
      }
      applyServed(response.current_position, response.question, response.total_questions);
    } catch {
      setLoadError('Could not load this practice session.');
    } finally {
      setIsLoading(false);
    }
  }, [applyServed]);

  useEffect(() => {
    let cancelled = false;

    // The IIFE's first statement is the request, so no state is written
    // synchronously during the effect — nothing here can cascade a render.
    void (async () => {
      await fetchSession(() => cancelled);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchSession]);

  const retryLoad = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    await fetchSession();
  }, [fetchSession]);

  // Per-question and whole-session clocks. Both are client-side; the per-question
  // value is what gets sent as time_spent_seconds when the answer is submitted.
  useEffect(() => {
    const id = setInterval(() => {
      setSessionSeconds((s) => s + 1);
      setSlots((prev) => {
        const index = positionRef.current - 1;
        if (!prev[index] || prev[index].answered) {
          return prev;
        }
        const next = [...prev];
        next[index] = { ...next[index], timeSpentSeconds: next[index].timeSpentSeconds + 1 };
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const patchCurrent = useCallback((patch: Partial<SessionSlot>) => {
    setSlots((prev) => {
      const index = positionRef.current - 1;
      if (!prev[index]) {
        return prev;
      }
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const selectAnswer = useCallback(
    (answer: string) => patchCurrent({ selectedAnswer: answer }),
    [patchCurrent]
  );
  const selectConfidence = useCallback(
    (level: number) => patchCurrent({ confidence: level }),
    [patchCurrent]
  );

  /** Persist the current slot before leaving it: a first answer creates the attempt,
   *  a changed answer on an already-answered slot updates it. */
  const commitCurrent = useCallback(async () => {
    const slot = slots[positionRef.current - 1];
    if (!slot || slot.selectedAnswer === null) {
      return;
    }

    if (!slot.answered) {
      const response = await submitAnswer(
        slot.selectedAnswer,
        slot.timeSpentSeconds,
        slot.confidence
      );
      patchCurrent({
        answered: true,
        skipped: false,
        attemptId: response.attempt_id,
        firstSubmittedAnswer: slot.selectedAnswer,
      });
      return;
    }

    if (slot.attemptId !== null && slot.selectedAnswer !== slot.firstSubmittedAnswer) {
      await updateAttempt(slot.attemptId, slot.selectedAnswer);
    }
  }, [slots, patchCurrent]);

  const goToPosition = useCallback(
    async (position: number) => {
      if (position < 1 || (totalQuestions > 0 && position > totalQuestions)) {
        return;
      }

      const target = slots[position - 1];
      if (target?.question) {
        // Already seen — render from cache. Refetching an answered position 400s.
        setCurrentPosition(position);
        return;
      }

      setIsBusy(true);
      try {
        const response = await getCurrentQuestion(position);
        if (response.question && response.current_position !== null) {
          applyServed(response.current_position, response.question, response.total_questions);
        }
      } catch {
        setLoadError('Could not open that question.');
      } finally {
        setIsBusy(false);
      }
    },
    [slots, totalQuestions, applyServed]
  );

  const goNext = useCallback(async () => {
    setIsBusy(true);
    try {
      await commitCurrent();
      await goToPosition(positionRef.current + 1);
    } catch {
      setLoadError('Could not save your answer.');
    } finally {
      setIsBusy(false);
    }
  }, [commitCurrent, goToPosition]);

  const goPrevious = useCallback(async () => {
    await goToPosition(positionRef.current - 1);
  }, [goToPosition]);

  /** Skipping deliberately does not call /answer: leaving the position ASSIGNED
   *  server-side is the only way it can be served again later. */
  const skip = useCallback(async () => {
    patchCurrent({ skipped: true });
    await goToPosition(positionRef.current + 1);
  }, [patchCurrent, goToPosition]);

  const finish = useCallback(async () => {
    setIsBusy(true);
    try {
      await commitCurrent();
      return await completePractice();
    } catch {
      setLoadError('Could not finish this session.');
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [commitCurrent]);

  return {
    slots,
    currentPosition,
    current: slots[currentPosition - 1],
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
  };
}
