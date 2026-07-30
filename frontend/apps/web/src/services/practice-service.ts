import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { mockHandlers } from '@/mocks';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type {
  SectionContextResponse,
  StartPracticeResponse,
  AnswerResponse,
  QuestionResponse,
  CompleteResponse,
} from '@/types/api';

export interface StartPracticePayload {
  section_id?: number;
  mode: 'section' | 'adaptive' | 'topic';
  topic_id?: number;
}

export async function selectSection(sectionId: number): Promise<SectionContextResponse> {
  try {
    const response = await apiClient.post<SectionContextResponse>(
      API.PRACTICE.SELECT_SECTION,
      { section_id: sectionId }
    );
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API selectSection failed, returning mock fallback response:', error);
    return mockHandlers.selectSection(sectionId);
  }
}

export async function startPractice(
  payload: StartPracticePayload
): Promise<StartPracticeResponse> {
  try {
    const response = await apiClient.post<StartPracticeResponse>(
      API.PRACTICE.START,
      payload
    );
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API startPractice failed, returning mock fallback response:', error);
    return mockHandlers.startPractice();
  }
}

export async function submitAnswer(
  selectedAnswer: string,
  timeSpentSeconds: number,
  confidenceLevel: number
): Promise<AnswerResponse> {
  try {
    const response = await apiClient.post<AnswerResponse>(API.PRACTICE.ANSWER, {
      selected_answer: selectedAnswer,
      time_spent_seconds: timeSpentSeconds,
      confidence_level: confidenceLevel,
    });
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API submitAnswer failed, returning mock fallback response:', error);
    return mockHandlers.submitAnswer(selectedAnswer, timeSpentSeconds, confidenceLevel);
  }
}

// ASSUMPTION (not confirmed by backend): no param returns the active session's current question.
// Comment this clearly — if wrong, this is the first thing to fix.
export async function getCurrentQuestion(): Promise<QuestionResponse> {
  try {
    const response = await apiClient.get<QuestionResponse>(API.PRACTICE.QUESTION);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API getCurrentQuestion failed, returning mock fallback response:', error);
    return mockHandlers.getCurrentQuestion();
  }
}

export async function completePractice(): Promise<CompleteResponse> {
  try {
    const response = await apiClient.post<CompleteResponse>(API.PRACTICE.COMPLETE);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API completePractice failed, returning mock fallback response:', error);
    return mockHandlers.completePractice();
  }
}
