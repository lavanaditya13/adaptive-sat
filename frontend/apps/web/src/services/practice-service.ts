import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { mockHandlers } from '@/mocks';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type {
  SectionContextResponse,
  StartPracticeResponse,
  AnswerResponse,
  AbandonResponse,
  QuestionResponse,
  CompleteResponse,
  UpdateAttemptResponse,
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

export async function abandonPractice(): Promise<AbandonResponse> {
  try {
    const response = await apiClient.post<AbandonResponse>(API.PRACTICE.ABANDON);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API abandonPractice failed, returning mock fallback response:', error);
    return mockHandlers.abandonPractice();
  }
}

/**
 * `selectedAnswer: null` records a deliberate skip — the backend stores an
 * attempt with no choice and advances the session, which is the only way to
 * move past a question without answering it.
 *
 * `confidence` is the canonical field name in the OpenAPI schema;
 * `confidence_level` is its alias and is sent alongside so the payload is
 * accepted by both the aliased and the pre-alias backend. Both must be 1–5 —
 * a CHECK constraint rejects 0 and 6.
 */
export async function submitAnswer(
  selectedAnswer: string | null,
  timeSpentSeconds: number,
  confidenceLevel: number
): Promise<AnswerResponse> {
  try {
    const response = await apiClient.post<AnswerResponse>(API.PRACTICE.ANSWER, {
      selected_answer: selectedAnswer,
      time_spent_seconds: timeSpentSeconds,
      confidence: confidenceLevel,
      confidence_level: confidenceLevel,
    });
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API submitAnswer failed, returning mock fallback response:', error);
    return mockHandlers.submitAnswer(selectedAnswer ?? '', timeSpentSeconds, confidenceLevel);
  }
}

/* Returns the session's next `ASSIGNED` question. The endpoint also takes a
   `questionId` query param — a 1-based position within the session, not a Question
   primary key — but it 400s on any position already answered and 404s on one that
   doesn't exist, so it cannot re-serve past questions. Review is therefore backed by
   the client-side cache in `use-question-session`, and this call takes no argument. */
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

export async function updateAttempt(
  attemptId: number,
  selectedAnswer: string | null
): Promise<UpdateAttemptResponse> {
  const response = await apiClient.put<UpdateAttemptResponse>(
    API.PRACTICE.ATTEMPT_UPDATE(attemptId),
    { selected_answer: selectedAnswer }
  );
  return response.data;
}
