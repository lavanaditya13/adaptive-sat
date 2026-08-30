import type { StudyPlanItem } from '@/types/api';

export const TITLE = 'Study plan';
export const DESCRIPTION =
  'Topics worth reviewing next, ranked by mastery. Regenerate any time your progress changes.';

export const EMPTY_MESSAGE =
  'Complete a practice session and your study plan will show up here.';

export const REGENERATE_LABEL = 'Regenerate';
export const REGENERATING_LABEL = 'Regenerating…';
export const REGENERATE_ERROR_MESSAGE = 'Could not regenerate the study plan. Try again.';

export function buildQuestionCountCaption(recommendedQuestions: number): string {
  return `${recommendedQuestions} question${recommendedQuestions === 1 ? '' : 's'} recommended`;
}

interface PriorityBadge {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/* Priority badge rule: high=danger/red, medium=warning/amber, low=success/green
   -- the same danger/warning/success tokens used elsewhere in the dashboard
   (see globals.css), just mapped from StudyPlanItem.priority instead of an
   accuracy threshold like getAccuracyBadge in practice-visuals.ts. Kept local
   to this card rather than folded into practice-visuals.ts since it keys off
   a different domain concept (priority, not accuracy) with no other caller. */
const PRIORITY_BADGES: Record<StudyPlanItem['priority'], PriorityBadge> = {
  high: {
    label: 'High priority',
    textClass: 'text-danger',
    bgClass: 'bg-danger/15',
    borderClass: 'border-danger/20',
  },
  medium: {
    label: 'Medium priority',
    textClass: 'text-warning',
    bgClass: 'bg-warning/15',
    borderClass: 'border-warning/20',
  },
  low: {
    label: 'Low priority',
    textClass: 'text-success',
    bgClass: 'bg-success/15',
    borderClass: 'border-success/20',
  },
};

export function getPriorityBadge(priority: StudyPlanItem['priority']): PriorityBadge {
  return PRIORITY_BADGES[priority];
}
