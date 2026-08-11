import { create } from 'zustand';
import type { NavigationResponse, Question, SessionQuestionState } from '@/types/api';

interface RestoredAnswer {
  isAnswered: boolean;
  selectedAnswer: string | null;
  confidenceLevel: number | null;
}

interface PracticeSessionState {
  currentQuestion: Question | null;
  currentPosition: number;
  totalQuestions: number;
  confidenceLevel: number;
  selectedAnswer: string | null;
  timeSpentSeconds: number;

  // Server-owned map of which positions are answered. This replaces the old
  // client-only `answeredHistory`, which could not survive a reload and only
  // ever grew forwards, so it could not describe a skipped question.
  questionStates: SessionQuestionState[];
  answeredCount: number;
  remainingCount: number;
  nextUnansweredPosition: number | null;
  // Whether the position currently on screen has already been answered.
  isCurrentAnswered: boolean;

  setSessionData: (
    question: Question,
    position: number,
    total: number,
    restored?: RestoredAnswer
  ) => void;
  setNavigation: (navigation: NavigationResponse) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setConfidenceLevel: (level: number) => void;
  setTimeSpentSeconds: (seconds: number) => void;
  resetSession: () => void;
}

const DEFAULT_CONFIDENCE = 3;

const initialState = {
  currentQuestion: null,
  currentPosition: 0,
  totalQuestions: 0,
  confidenceLevel: DEFAULT_CONFIDENCE,
  selectedAnswer: null,
  timeSpentSeconds: 0,
  questionStates: [],
  answeredCount: 0,
  remainingCount: 0,
  nextUnansweredPosition: null,
  isCurrentAnswered: false,
};

export const usePracticeSessionStore = create<PracticeSessionState>((set) => ({
  ...initialState,

  setSessionData: (question, position, total, restored) =>
    set({
      currentQuestion: question,
      currentPosition: position,
      totalQuestions: total,
      timeSpentSeconds: 0,
      // Landing on an already-answered position re-hydrates the student's
      // previous choice so they can see and revise it, rather than a blank form.
      selectedAnswer: restored?.selectedAnswer ?? null,
      confidenceLevel: restored?.confidenceLevel ?? DEFAULT_CONFIDENCE,
      isCurrentAnswered: restored?.isAnswered ?? false,
    }),

  setNavigation: (navigation) =>
    set({
      questionStates: navigation.questions,
      answeredCount: navigation.answered_count,
      remainingCount: navigation.remaining_count,
      nextUnansweredPosition: navigation.next_unanswered_position,
      totalQuestions: navigation.total_questions,
    }),

  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  setConfidenceLevel: (confidenceLevel) => set({ confidenceLevel }),
  setTimeSpentSeconds: (timeSpentSeconds) => set({ timeSpentSeconds }),

  resetSession: () => set({ ...initialState }),
}));
