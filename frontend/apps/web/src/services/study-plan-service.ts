import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { mockHandlers } from '@/mocks';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { StudyPlanResponse } from '@/types/api';

export async function getStudyPlan(): Promise<StudyPlanResponse> {
  try {
    const response = await apiClient.get<StudyPlanResponse>(API.STUDY_PLAN.GET);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API getStudyPlan failed, returning mock fallback response:', error);
    return mockHandlers.getStudyPlan();
  }
}

export async function regenerateStudyPlan(): Promise<StudyPlanResponse> {
  try {
    const response = await apiClient.post<StudyPlanResponse>(API.STUDY_PLAN.REGENERATE);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API regenerateStudyPlan failed, returning mock fallback response:', error);
    return mockHandlers.regenerateStudyPlan();
  }
}
