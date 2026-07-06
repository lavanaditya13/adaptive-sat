import { create } from 'zustand';
import { Question, SubmitAnswerResponse } from '../types/api';

export type SessionPhase = 'loading' | 'answering' | 'submitting' | 'feedback' | 'completing' | 'error';

interface FeedbackState {
    selectedOption: string;
    result: SubmitAnswerResponse;
}

interface PracticeSessionState {
    // Session metadata
    sessionId: string | null;
    topic: string | null;
    questions: Question[];
    startedAt: string | null;

    // Current state
    currentIndex: number;
    phase: SessionPhase;
    feedback: FeedbackState | null;
    questionStartTime: number; // ms timestamp when question was shown
    error: string | null;

    // Actions
    initSession: (sessionId: string, topic: string, questions: Question[], startedAt: string) => void;
    setPhase: (phase: SessionPhase) => void;
    selectAnswer: (selectedOption: string, result: SubmitAnswerResponse) => void;
    advanceQuestion: () => void;
    resetQuestionTimer: () => void;
    setError: (error: string) => void;
    reset: () => void;
}

const initialState = {
    sessionId: null,
    topic: null,
    questions: [],
    startedAt: null,
    currentIndex: 0,
    phase: 'loading' as SessionPhase,
    feedback: null,
    questionStartTime: Date.now(),
    error: null,
};

export const usePracticeSessionStore = create<PracticeSessionState>()((set) => ({
    ...initialState,

    initSession: (sessionId, topic, questions, startedAt) =>
        set({
            sessionId,
            topic,
            questions,
            startedAt,
            currentIndex: 0,
            phase: 'answering',
            feedback: null,
            questionStartTime: Date.now(),
            error: null,
        }),

    setPhase: (phase) => set({ phase }),

    selectAnswer: (selectedOption, result) =>
        set({
            phase: 'feedback',
            feedback: { selectedOption, result },
        }),

    advanceQuestion: () =>
        set((state) => ({
            currentIndex: state.currentIndex + 1,
            phase: 'answering',
            feedback: null,
            questionStartTime: Date.now(),
        })),

    resetQuestionTimer: () => set({ questionStartTime: Date.now() }),

    setError: (error) => set({ phase: 'error', error }),

    reset: () => set(initialState),
}));
