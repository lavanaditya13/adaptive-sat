import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import type { SectionName } from '@/constants/section-theme';
import { getSkillTree, type SkillTreeDomain, type SkillTreeResponse } from '@/services/skill-tree-service';

const SECTION_NAMES: SectionName[] = ['math', 'reading_writing'];

/** Guards the `:subject` URL segment before it reaches the API. */
export function isSectionName(value: string | undefined): value is SectionName {
  return SECTION_NAMES.some((section) => section === value);
}

/**
 * Skill tree for one section. `section` is null while the URL subject is
 * invalid, which keeps the query disabled until the page redirects away.
 */
export function useSkillTree(section: SectionName | null) {
  return useQuery<SkillTreeResponse>({
    queryKey: queryKeys.practice.skillTree(section ?? ''),
    queryFn: () => getSkillTree(section as SectionName),
    enabled: section !== null,
  });
}

/** Domain lookup is by display name because that is what the URL carries. */
export function findDomain(
  tree: SkillTreeResponse | undefined,
  domainName: string | undefined
): SkillTreeDomain | undefined {
  if (!tree || !domainName) {
    return undefined;
  }

  return tree.domains.find((domain) => domain.name === domainName);
}

/** Section-wide accuracy, rolled up from the domains already on the page. */
export function getOverallAccuracy(tree: SkillTreeResponse): {
  accuracy: number;
  questionsAttempted: number;
} {
  const questionsAttempted = tree.domains.reduce(
    (total, domain) => total + domain.questionsAttempted,
    0
  );
  const questionsCorrect = tree.domains.reduce(
    (total, domain) => total + domain.questionsCorrect,
    0
  );

  return {
    questionsAttempted,
    accuracy: questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0,
  };
}
