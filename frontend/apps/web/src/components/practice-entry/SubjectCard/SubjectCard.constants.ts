export const ACCURACY_LABEL = 'Accuracy';
export const QUESTIONS_LABEL = 'Questions done';
export const DOMAINS_LABEL = 'Domains';
export const NO_DATA_VALUE = '—';

/** Copy per section; falls back to a generic line for any section the API adds. */
export const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  math: 'Algebra, advanced math, geometry, statistics, and data analysis.',
  reading_writing: 'Information and ideas, craft, expression, grammar, and cross-text analysis.',
};

export const FALLBACK_DESCRIPTION = 'Practice questions across this section.';

export function getSubjectDescription(sectionName: string): string {
  return SUBJECT_DESCRIPTIONS[sectionName] ?? FALLBACK_DESCRIPTION;
}
