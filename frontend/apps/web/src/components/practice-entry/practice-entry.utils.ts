import type { SectionName } from '@/constants/section-theme';

/** The section codes the backend actually accepts (`SECTION_CODES`). */
export const SECTION_NAMES: readonly SectionName[] = ['math', 'reading_writing'];

export function isSectionName(value: string | undefined): value is SectionName {
  return value !== undefined && (SECTION_NAMES as readonly string[]).includes(value);
}

export type AccuracyTone = 'good' | 'mid' | 'low';

/** Design rule (`badgeColors`): >=80 green, >=50 amber, otherwise neutral grey. */
export function getAccuracyTone(accuracy: number): AccuracyTone {
  if (accuracy >= 80) {
    return 'good';
  }

  if (accuracy >= 50) {
    return 'mid';
  }

  return 'low';
}

export const ACCURACY_TEXT_STYLES: Record<AccuracyTone, string> = {
  good: 'text-success',
  mid: 'text-warning',
  low: 'text-ink-muted',
};

export const ACCURACY_BADGE_STYLES: Record<AccuracyTone, string> = {
  good: 'bg-success/15 text-success border-success/20',
  mid: 'bg-warning/15 text-warning border-warning/20',
  low: 'bg-white/5 text-ink-muted border-hairline-strong',
};

/** Rounds an API accuracy (which may be fractional) for display. */
export function formatAccuracy(accuracy: number): number {
  return Math.round(accuracy);
}
