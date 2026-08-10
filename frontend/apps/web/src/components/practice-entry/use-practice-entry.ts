import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { getDashboard } from '@/services/dashboard-service';
import { selectSection } from '@/services/practice-service';
import { getSkillTree } from './practice-entry-service';
import type { DashboardResponse } from '@/types/api';

export type DashboardSection = DashboardResponse['sections'][number];

/**
 * Per-section accuracy / questions-completed / domain count for both practice
 * entry screens. The dashboard endpoint carries every section in one response,
 * so the subject picker needs a single request and the practice home reuses the
 * same cache entry.
 */
export function useSectionSummaries() {
  const query = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: getDashboard,
  });

  return { ...query, sections: query.data?.sections ?? [] };
}

export function useSectionSummary(subject: string) {
  const { sections, ...rest } = useSectionSummaries();

  return { ...rest, section: sections.find((item) => item.name === subject) ?? null };
}

/** Domain -> skill tree for the chosen section; supplies the real domain list. */
export function useSkillTree(subject: string) {
  return useQuery({
    queryKey: queryKeys.practice.skillTree(subject),
    queryFn: () => getSkillTree(subject),
  });
}

/**
 * Practice modes for the chosen section.
 *
 * `POST /practice/context/section` is the only endpoint that reports the
 * adaptive gate, and it also records the section that `POST /practice/start`
 * later reads — so landing on the practice home is exactly when it should run.
 * It is modelled as a query (not a mutation) because the screen needs its
 * result to render, and re-selecting the same section is idempotent.
 */
export function useSectionPracticeOptions(sectionId: number | undefined) {
  const query = useQuery({
    queryKey: queryKeys.practice.sectionContext(sectionId ?? -1),
    queryFn: () => selectSection(sectionId as number),
    enabled: sectionId !== undefined,
  });

  return { ...query, options: query.data?.practice_options ?? [] };
}
