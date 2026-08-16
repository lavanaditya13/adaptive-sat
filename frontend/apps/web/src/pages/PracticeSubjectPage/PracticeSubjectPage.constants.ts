import type { SectionName } from '@/constants/section-theme';

export const PAGE_TITLE = 'Practice';
export const PAGE_DESCRIPTION = 'Choose a section to start practicing.';

export const SECTION_ORDER: SectionName[] = ['math', 'reading_writing'];

export const SECTION_DESCRIPTIONS: Record<SectionName, string> = {
  math: 'Algebra, advanced math, geometry, statistics, and data analysis.',
  reading_writing: 'Information and ideas, craft, expression, grammar, and cross-text analysis.',
};
