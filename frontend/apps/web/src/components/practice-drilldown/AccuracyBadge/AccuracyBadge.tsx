import { getAccuracyLabel, getAccuracyTone } from './AccuracyBadge.constants';
import { BADGE_STYLES, BADGE_TONE_STYLES } from './AccuracyBadge.styles';

interface AccuracyBadgeProps {
  accuracy: number;
  questionsAttempted: number;
}

/** Accuracy pill on every domain/skill row. Numerals are DM Mono per tokens. */
export function AccuracyBadge({ accuracy, questionsAttempted }: AccuracyBadgeProps) {
  const tone = getAccuracyTone(accuracy, questionsAttempted);

  return (
    <span className={`${BADGE_STYLES} ${BADGE_TONE_STYLES[tone]}`}>
      {getAccuracyLabel(accuracy, questionsAttempted)}
    </span>
  );
}
