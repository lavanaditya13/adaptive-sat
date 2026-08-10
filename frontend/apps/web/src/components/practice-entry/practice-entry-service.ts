import apiClient from '@/services/api-client';
import { API } from '@/constants/api-endpoints';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { SkillTreeResponse } from './practice-entry.types';

/**
 * Skill-tree fetch for the practice entry screens.
 *
 * Lives here rather than in `services/practice-service.ts` because that file is
 * shared with the concurrently-developed session/drill-down segments; keeping
 * this call inside the segment avoids a merge conflict on a shared module. Fold
 * it into `practice-service.ts` once the redesign branches are merged.
 */
export async function getSkillTree(section: string): Promise<SkillTreeResponse> {
  try {
    const response = await apiClient.get<SkillTreeResponse>(API.PRACTICE.SKILL_TREE, {
      params: { section },
    });

    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    /* The entry screens degrade to the dashboard's `topics_count` when the
       tree is unavailable, so an empty tree is a safe, honest fallback. */
    console.warn('API getSkillTree failed, returning an empty domain tree:', error);

    return {
      section,
      sectionDisplayName: '',
      masteryRule: { accuracy: 85, minQuestions: 10 },
      domains: [],
    };
  }
}
