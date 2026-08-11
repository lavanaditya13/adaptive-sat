import { Trophy } from 'lucide-react';
import { getMasteryState, MASTERY_LABELS } from './MasteryPill.constants';
import { PILL_ICON_STYLES, PILL_STYLES, PILL_TONE_STYLES } from './MasteryPill.styles';

interface MasteryPillProps {
  mastered: boolean;
  questionsAttempted: number;
}

/** Mastery indicator. Mastered nodes get the trophy; the rest state their stage. */
export function MasteryPill({ mastered, questionsAttempted }: MasteryPillProps) {
  const state = getMasteryState(mastered, questionsAttempted);

  return (
    <span className={`${PILL_STYLES} ${PILL_TONE_STYLES[state]}`}>
      {state === 'mastered' && <Trophy className={PILL_ICON_STYLES} aria-hidden="true" />}
      {MASTERY_LABELS[state]}
    </span>
  );
}
