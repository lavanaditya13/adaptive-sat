import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { SkillTreeResponse } from '@/types/api';
import type { SectionName } from '@/constants/section-theme';

/* Single client for GET /api/v1/practice/skill-tree — backs the subject
   picker, per-subject home, domains list, and skills list. Keep it the only
   caller of this endpoint so the four practice-drilldown screens never drift
   out of sync on shape or mock fallback behavior. */

function buildMockSkillTree(section: SectionName): SkillTreeResponse {
  const isMath = section === 'math';
  return {
    section,
    sectionDisplayName: isMath ? 'Math' : 'Reading & Writing',
    masteryRule: { accuracy: 85, minQuestions: 10 },
    domains: isMath
      ? [
          {
            name: 'Algebra',
            topicId: 1,
            topicCode: 'ALGEBRA',
            accuracy: 85,
            questionsAttempted: 38,
            questionsCorrect: 32,
            mastered: false,
            skills: [
              {
                name: 'Linear equations in one variable',
                accuracy: 90,
                questionsAttempted: 12,
                questionsCorrect: 11,
                mastered: true,
              },
              {
                name: 'Systems of linear equations',
                accuracy: 75,
                questionsAttempted: 8,
                questionsCorrect: 6,
                mastered: false,
              },
            ],
          },
          {
            name: 'Advanced Math',
            topicId: 2,
            topicCode: 'ADVANCED_MATH',
            accuracy: 78,
            questionsAttempted: 32,
            questionsCorrect: 25,
            mastered: false,
            skills: [
              {
                name: 'Nonlinear functions',
                accuracy: 74,
                questionsAttempted: 12,
                questionsCorrect: 9,
                mastered: false,
              },
            ],
          },
          {
            name: 'Geometry and Trigonometry',
            topicId: 3,
            topicCode: 'GEOMETRY',
            accuracy: 0,
            questionsAttempted: 0,
            questionsCorrect: 0,
            mastered: false,
            skills: [
              {
                name: 'Right triangles & trigonometry',
                accuracy: 0,
                questionsAttempted: 0,
                questionsCorrect: 0,
                mastered: false,
              },
            ],
          },
        ]
      : [
          {
            name: 'Information and Ideas',
            topicId: 1,
            topicCode: 'INFO_IDEAS',
            accuracy: 80,
            questionsAttempted: 35,
            questionsCorrect: 28,
            mastered: false,
            skills: [
              {
                name: 'Central ideas & details',
                accuracy: 84,
                questionsAttempted: 12,
                questionsCorrect: 10,
                mastered: false,
              },
            ],
          },
          {
            name: 'Craft and Structure',
            topicId: 2,
            topicCode: 'CRAFT_STRUCTURE',
            accuracy: 72,
            questionsAttempted: 38,
            questionsCorrect: 27,
            mastered: false,
            skills: [
              {
                name: 'Words in context',
                accuracy: 75,
                questionsAttempted: 14,
                questionsCorrect: 11,
                mastered: false,
              },
            ],
          },
        ],
  };
}

export async function getSkillTree(section: SectionName): Promise<SkillTreeResponse> {
  try {
    const response = await apiClient.get<SkillTreeResponse>(API.PRACTICE.SKILL_TREE, {
      params: { section },
    });
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API getSkillTree failed, returning mock fallback response:', error);
    return buildMockSkillTree(section);
  }
}
