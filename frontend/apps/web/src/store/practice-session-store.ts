import { create } from 'zustand';
import type { Question } from '@/types/api';

interface AnsweredQuestion {
  position: number;
  question: Question;
  selectedAnswer: string | null;
  confidenceLevel: number;
  attemptId: number;
}

interface PracticeSessionState {
  currentQuestion: Question | null;
  currentPosition: number;
  totalQuestions: number;
  confidenceLevel: number;
  selectedAnswer: string | null;
  timeSpentSeconds: number;
  answeredHistory: AnsweredQuestion[];
  reviewIndex: number | null;

  setSessionData: (question: Question, position: number, total: number) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setConfidenceLevel: (level: number) => void;
  setTimeSpentSeconds: (seconds: number) => void;
  pushAnsweredQuestion: (entry: AnsweredQuestion) => void;
  updateAnsweredQuestion: (position: number, newAnswer: string | null) => void;
  setReviewIndex: (index: number | null) => void;
  resetSession: () => void;
}

export const usePracticeSessionStore = create<PracticeSessionState>((set) => ({
  currentQuestion: null,
  currentPosition: 0,
  totalQuestions: 0,
  confidenceLevel: 3,
  selectedAnswer: null,
  timeSpentSeconds: 0,
  answeredHistory: [],
  reviewIndex: null,

  setSessionData: (question, position, total) =>
    set({
      currentQuestion: question,
      currentPosition: position,
      totalQuestions: total,
      selectedAnswer: null,
      confidenceLevel: 3,
      timeSpentSeconds: 0,
      reviewIndex: null,
    }),

  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  setConfidenceLevel: (confidenceLevel) => set({ confidenceLevel }),
  setTimeSpentSeconds: (timeSpentSeconds) => set({ timeSpentSeconds }),

  pushAnsweredQuestion: (entry) =>
    set((state) => ({ answeredHistory: [...state.answeredHistory, entry] })),

  updateAnsweredQuestion: (position, newAnswer) =>
    set((state) => ({
      answeredHistory: state.answeredHistory.map((entry) =>
        entry.position === position ? { ...entry, selectedAnswer: newAnswer } : entry
      ),
    })),

  setReviewIndex: (reviewIndex) => set({ reviewIndex }),

  resetSession: () =>
    set({
      currentQuestion: null,
      currentPosition: 0,
      totalQuestions: 0,
      confidenceLevel: 3,
      selectedAnswer: null,
      timeSpentSeconds: 0,
      answeredHistory: [],
      reviewIndex: null,
    }),
}));

export type { AnsweredQuestion };
