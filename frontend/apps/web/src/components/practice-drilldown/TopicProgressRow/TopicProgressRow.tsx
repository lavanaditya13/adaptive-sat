import { ChevronRight, Award } from 'lucide-react';
import { getAccuracyBadge, type PracticeAccent } from '@/constants/practice-visuals';
import { MASTERED_LABEL, QUESTIONS_ATTEMPTED_SUFFIX } from './TopicProgressRow.constants';
import {
  ACTIONS_ROW_STYLES,
  BADGE_STYLES,
  CAPTION_STYLES,
  CARD_STYLES,
  FILL_STYLES,
  HEADER_ROW_STYLES,
  MASTERED_PILL_STYLES,
  NAME_ROW_STYLES,
  NAME_STYLES_DOMAIN,
  NAME_STYLES_SKILL,
  SECONDARY_BUTTON_STYLES,
  START_BUTTON_STYLES,
  TRACK_STYLES,
} from './TopicProgressRow.styles';

interface TopicProgressRowProps {
  variant: 'domain' | 'skill';
  name: string;
  accuracy: number;
  questionsAttempted: number;
  mastered: boolean;
  accent: PracticeAccent;
  startLabel: string;
  onStart: () => void;
  isStarting?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function TopicProgressRow({
  variant,
  name,
  accuracy,
  questionsAttempted,
  mastered,
  accent,
  startLabel,
  onStart,
  isStarting = false,
  secondaryLabel,
  onSecondary,
}: TopicProgressRowProps) {
  const badge = getAccuracyBadge(accuracy, questionsAttempted);
  const fillWidth = questionsAttempted === 0 ? '0%' : `${accuracy}%`;

  return (
    <div className={CARD_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <div className="min-w-0 flex-1">
          <div className={NAME_ROW_STYLES}>
            <p className={variant === 'domain' ? NAME_STYLES_DOMAIN : NAME_STYLES_SKILL}>
              {name}
            </p>
            {mastered && (
              <span className={MASTERED_PILL_STYLES}>
                <Award className="size-2.5" aria-hidden="true" />
                {MASTERED_LABEL}
              </span>
            )}
          </div>
          <p className={CAPTION_STYLES}>
            {questionsAttempted}
            {QUESTIONS_ATTEMPTED_SUFFIX}
          </p>
        </div>
        <span
          className={`${BADGE_STYLES} ${badge.textClass} ${badge.bgClass} ${badge.borderClass}`}
        >
          {badge.label}
        </span>
      </div>

      <div className={TRACK_STYLES}>
        <div className={`${FILL_STYLES} ${accent.solid}`} style={{ width: fillWidth }} />
      </div>

      <div className={ACTIONS_ROW_STYLES}>
        <button
          type="button"
          className={`${START_BUTTON_STYLES} ${accent.button}`}
          onClick={onStart}
          disabled={isStarting}
        >
          {startLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" className={SECONDARY_BUTTON_STYLES} onClick={onSecondary}>
            {secondaryLabel}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
