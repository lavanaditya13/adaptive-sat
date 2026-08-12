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
    questions_correct: 113,
    accuracy_trend_percentage: 4.2,
    avg_session_minutes: 25,
    day_streak: 14,
  },
  weak_topics: [
    {
      topic_id: 14,
      display_name: 'Algebra',
      mastery_score: 45,
      questions_attempted: 20,
      questions_correct: 9,
      section: 'math',
      section_id: 1,
      section_display_name: 'Math',
      practice_topic_id: 1,
    },
    {
      topic_id: 21,
      display_name: 'Problem-Solving and Data Analysis',
      mastery_score: 52,
      questions_attempted: 25,
      questions_correct: 13,
      section: 'math',
      section_id: 1,
      section_display_name: 'Math',
      practice_topic_id: 4,
    },
    {
      topic_id: 33,
      display_name: 'Craft and Structure',
      mastery_score: 60,
      questions_attempted: 15,
      questions_correct: 9,
      section: 'reading_writing',
      section_id: 2,
      section_display_name: 'Reading & Writing',
      practice_topic_id: 2,
    },
  ],
  sections: [
    {
      section_id: 1,
      name: 'math',
      display_name: 'Math',
      accuracy_percentage: 82,
      questions_completed: 148,
      topics_count: 5,
    },
    {
      section_id: 2,
      name: 'reading_writing',
      display_name: 'Reading & Writing',
      accuracy_percentage: 77,
      questions_completed: 162,
      topics_count: 5,
    },
  ],
  estimated_score: {
    estimated_score: 1420,
    target_score: 1520,
    points_to_go: 100,
    percent_to_goal: 93.4,
  },
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
