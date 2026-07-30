import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import type { DashboardResponse } from '@/types/api';
import { shouldUseMockFallback } from '@/utils/api-errors';

export const MOCK_DASHBOARD: DashboardResponse = {
  student: { full_name: 'Alex Student' },
  progress: {
    sessions_completed: 12,
    questions_answered: 145,
    accuracy_percentage: 78,
  },
  weak_topics: [
    { topic_id: 1, display_name: 'Linear Equations in Two Variables', mastery_score: 45 },
    { topic_id: 2, display_name: 'Problem Solving and Data Analysis', mastery_score: 52 },
    { topic_id: 3, display_name: 'Expression Simplification & Factoring', mastery_score: 60 },
  ],
  sections: [
    { section_id: 1, name: 'math', display_name: 'Math' },
    { section_id: 2, name: 'reading_writing', display_name: 'Reading & Writing' },
  ],
};

export async function getDashboard(): Promise<DashboardResponse> {
  try {
    const response = await apiClient.get<DashboardResponse>(API.DASHBOARD);
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('Backend unavailable, returning mock dashboard data:', error);
    return MOCK_DASHBOARD;
  }
}
