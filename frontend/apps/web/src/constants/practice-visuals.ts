import { Calculator, BookOpen, type LucideIcon } from 'lucide-react';
import type { SectionName } from '@/constants/section-theme';

export interface PracticeAccent {
  Icon: LucideIcon;
  /** Icon-tile / lighter text color. */
  text: string;
  /** Solid fill — progress bars. */
  solid: string;
  /** Solid stroke — donut ring, same hue as `solid`. */
  stroke: string;
  /** Primary CTA background. */
  button: string;
  /** Icon tile background tint. */
  tint: string;
  /** Card border accent. */
  border: string;
}

const MATH_ACCENT: PracticeAccent = {
  Icon: Calculator,
  text: 'text-math-light',
  solid: 'bg-math',
  stroke: 'stroke-math',
  button: 'bg-math-button hover:bg-math-button/90',
  tint: 'bg-math/15',
  border: 'border-math/30',
};

const READING_ACCENT: PracticeAccent = {
  Icon: BookOpen,
  text: 'text-reading-light',
  solid: 'bg-reading',
  stroke: 'stroke-reading',
  button: 'bg-reading-button hover:bg-reading-button/90',
  tint: 'bg-reading/15',
  border: 'border-reading/30',
};

export function getPracticeAccent(section: SectionName): PracticeAccent {
  return section === 'reading_writing' ? READING_ACCENT : MATH_ACCENT;
}

export interface AccuracyBadge {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/** Badge rule: >=80 green, >=50 amber, else neutral grey — except an
 *  unattempted node, which reads "Not started" rather than a 0% failure. */
export function getAccuracyBadge(accuracy: number, questionsAttempted: number): AccuracyBadge {
  if (questionsAttempted === 0) {
    return {
      label: 'Not started',
      textClass: 'text-ink-muted',
      bgClass: 'bg-white/5',
      borderClass: 'border-hairline-strong',
    };
  }

  if (accuracy >= 80) {
    return {
      label: `${accuracy}%`,
      textClass: 'text-success',
      bgClass: 'bg-success/15',
      borderClass: 'border-success/20',
    };
  }

  if (accuracy >= 50) {
    return {
      label: `${accuracy}%`,
      textClass: 'text-warning',
      bgClass: 'bg-warning/15',
      borderClass: 'border-warning/20',
    };
  }

  return {
    label: `${accuracy}%`,
    textClass: 'text-ink-muted',
    bgClass: 'bg-white/5',
    borderClass: 'border-hairline-strong',
  };
}

export interface SkillTreeTotals {
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  domainsCount: number;
}

/** Aggregates subject-level stats from a skill tree's domain list — the API
 *  only reports accuracy per-domain/skill, not a subject-wide rollup. */
export function summarizeSkillTree(domains: { questionsAttempted: number; questionsCorrect: number }[]): SkillTreeTotals {
  const questionsAttempted = domains.reduce((sum, d) => sum + d.questionsAttempted, 0);
  const questionsCorrect = domains.reduce((sum, d) => sum + d.questionsCorrect, 0);
  const accuracy = questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0;

  return { accuracy, questionsAttempted, questionsCorrect, domainsCount: domains.length };
}
