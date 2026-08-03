import {
  MOCK_USER,
  MOCK_CONNECTED_PROVIDERS,
  MOCK_DASHBOARD,
  MOCK_SECTION_CONTEXT,
  MOCK_QUESTIONS,
  // MOCK_START_PRACTICE,
  // MOCK_ANSWER_RESPONSE,
  // MOCK_QUESTION_RESPONSE,
  MOCK_COMPLETE_RESPONSE,
} from './mock-data';
import type {
  User,
  ConnectedProvidersResponse,
  DashboardResponse,
  SectionContextResponse,
  StartPracticeResponse,
  AnswerResponse,
  QuestionResponse,
  CompleteResponse,
} from '@/types/api';

let activeQuestionIndex = 0;

export const mockHandlers = {
  getDashboard: async (): Promise<DashboardResponse> => {
    return MOCK_DASHBOARD;
  },

  selectSection: async (_sectionId: number): Promise<SectionContextResponse> => {
    return MOCK_SECTION_CONTEXT;
  },

  startPractice: async (): Promise<StartPracticeResponse> => {
    activeQuestionIndex = 0;
    return {
      status: 'in_progress',
      current_position: 1,
      total_questions: MOCK_QUESTIONS.length,
      question: MOCK_QUESTIONS[0],
    };
  },

  submitAnswer: async (
    _selectedAnswer: string,
    _timeSpentSeconds: number,
    _confidenceLevel: number
  ): Promise<AnswerResponse> => {
    const answeredPos = activeQuestionIndex + 1;
    activeQuestionIndex += 1;
    const remaining = Math.max(0, MOCK_QUESTIONS.length - activeQuestionIndex);
    return {
      saved: true,
      answered_position: answeredPos,
      remaining_questions: remaining,
    };
  },

  getCurrentQuestion: async (): Promise<QuestionResponse> => {
    const idx = Math.min(activeQuestionIndex, MOCK_QUESTIONS.length - 1);
    return {
      current_position: idx + 1,
      total_questions: MOCK_QUESTIONS.length,
      question: MOCK_QUESTIONS[idx],
    };
  },

  completePractice: async (): Promise<CompleteResponse> => {
    return MOCK_COMPLETE_RESPONSE;
  },

  getUser: async (): Promise<User> => {
    return MOCK_USER;
  },

  verifyEmail: async (_token: string): Promise<User> => {
    return { ...MOCK_USER, email_verified: true };
  },

  resendVerificationEmail: async (): Promise<void> => {
    return;
  },

  getConnectedProviders: async (): Promise<ConnectedProvidersResponse> => {
    return MOCK_CONNECTED_PROVIDERS;
  },

  unlinkProvider: async (_provider: 'google' | 'apple'): Promise<void> => {
    return;
  },
};
