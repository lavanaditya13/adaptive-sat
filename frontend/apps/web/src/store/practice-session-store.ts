import { create } from 'zustand';
import type { Question } from '@/types/api';

interface PracticeSessionState {
  currentQuestion: Question | null;
  currentPosition: number;
  totalQuestions: number;
  confidenceLevel: number;
  selectedAnswer: string | null;
  timeSpentSeconds: number;
  isAnswerSaved: boolean;

  setSessionData: (question: Question, position: number, total: number) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setConfidenceLevel: (level: number) => void;
  setTimeSpentSeconds: (seconds: number) => void;
  setIsAnswerSaved: (saved: boolean) => void;
  resetSession: () => void;
}

export const usePracticeSessionStore = create<PracticeSessionState>((set) => ({
  currentQuestion: null,
  currentPosition: 0,
  totalQuestions: 0,
  confidenceLevel: 3,
  selectedAnswer: null,
  timeSpentSeconds: 0,
  isAnswerSaved: false,

  setSessionData: (question, position, total) =>
    set({
      currentQuestion: question,
      currentPosition: position,
      totalQuestions: total,
      selectedAnswer: null,
      confidenceLevel: 3,
      timeSpentSeconds: 0,
      isAnswerSaved: false,
    }),

  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  setConfidenceLevel: (confidenceLevel) => set({ confidenceLevel }),
  setTimeSpentSeconds: (timeSpentSeconds) => set({ timeSpentSeconds }),
  setIsAnswerSaved: (isAnswerSaved) => set({ isAnswerSaved }),

  resetSession: () =>
    set({
      currentQuestion: null,
      currentPosition: 0,
      totalQuestions: 0,
      confidenceLevel: 3,
      selectedAnswer: null,
      timeSpentSeconds: 0,
      isAnswerSaved: false,
    }),
}));
