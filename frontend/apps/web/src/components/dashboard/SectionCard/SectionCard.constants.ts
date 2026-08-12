import { BookOpen, Calculator, type LucideIcon } from 'lucide-react';

export const ACCURACY_LABEL = 'Accuracy';
export const QUESTIONS_LABEL = 'Questions done';
export const DOMAINS_LABEL = 'Domains';
export const PERCENT_SUFFIX = '%';

interface SectionAccent {
  icon: LucideIcon;
  tile: string;
}

const MATH_ACCENT: SectionAccent = { icon: Calculator, tile: 'bg-math/15 text-math-light' };

const SECTION_ACCENTS: Record<string, SectionAccent> = {
  math: MATH_ACCENT,
  reading_writing: { icon: BookOpen, tile: 'bg-reading/15 text-reading-light' },
};

export function getSectionAccent(sectionName: string): SectionAccent {
  return SECTION_ACCENTS[sectionName] ?? MATH_ACCENT;
}

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  math: 'Algebra, advanced math, geometry, statistics, and data analysis.',
  reading_writing: 'Information and ideas, craft, expression, grammar, and cross-text analysis.',
};

/** Shared badge rule from TOKENS.md: >=80 green, >=50 amber, otherwise neutral. */
export function getAccuracyToneStyles(accuracyPercentage: number): string {
  if (accuracyPercentage >= 80) {
    return 'text-success';
  }

  if (accuracyPercentage >= 50) {
    return 'text-warning';
  }

  return 'text-ink-muted';
}
