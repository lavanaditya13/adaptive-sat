/** `badgeColors(pct)` from the design: >=80 green, >=50 amber, else grey. */
export const ACCURACY_SUCCESS_THRESHOLD = 80;
export const ACCURACY_WARNING_THRESHOLD = 50;

export type AccuracyTone = 'success' | 'warning' | 'neutral';

export const NOT_ATTEMPTED_LABEL = '—';
export const PERCENT_SUFFIX = '%';

/**
 * A node the student has never touched comes back as `accuracy: 0`. That is an
 * absence of data, not a 0% score, so it renders neutral with an em dash.
 */
export function getAccuracyTone(accuracy: number, questionsAttempted: number): AccuracyTone {
  if (questionsAttempted <= 0) {
    return 'neutral';
  }

  if (accuracy >= ACCURACY_SUCCESS_THRESHOLD) {
    return 'success';
  }

  if (accuracy >= ACCURACY_WARNING_THRESHOLD) {
    return 'warning';
  }

  return 'neutral';
}

export function getAccuracyLabel(accuracy: number, questionsAttempted: number): string {
  return questionsAttempted > 0 ? `${accuracy}${PERCENT_SUFFIX}` : NOT_ATTEMPTED_LABEL;
}
