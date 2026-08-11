export const ATTEMPTED_SUFFIX = ' questions attempted';
export const NOT_STARTED_META = 'Not started yet';
export const ACCURACY_METER_LABEL = 'accuracy';

export function buildMetaLabel(questionsAttempted: number): string {
  return questionsAttempted > 0 ? `${questionsAttempted}${ATTEMPTED_SUFFIX}` : NOT_STARTED_META;
}
