import type { QuestionBreakdownItem } from '@/types/api';

/** Formats a duration in seconds as `m:ss`, matching the design's `formatClock`. */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function sumTimeSpentSeconds(items: QuestionBreakdownItem[]): number {
  return items.reduce((total, item) => total + (item.time_spent_seconds ?? 0), 0);
}

/**
 * `average_confidence` is `null` when nothing was rated in the session - render that
 * honestly (an em dash) rather than coercing it to a misleading 0 or 3.
 */
export function formatAverageConfidence(averageConfidence: number | null): string {
  return averageConfidence === null ? '—' : averageConfidence.toFixed(1);
}

export type AccuracyTier = 'high' | 'mid' | 'low';

/** Accuracy badge rule: >=80 green, >=50 amber, else neutral grey. */
export function getAccuracyTier(percentage: number): AccuracyTier {
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'mid';
  return 'low';
}

export const ACCURACY_BADGE_CLASSES: Record<AccuracyTier, string> = {
  high: 'bg-success/15 text-success border border-success/20',
  mid: 'bg-warning/15 text-warning border border-warning/20',
  low: 'bg-surface-raised text-ink-muted border border-hairline-strong',
};
