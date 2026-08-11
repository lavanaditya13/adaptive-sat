import { Zap } from 'lucide-react';
import { getAccuracyBadge, type PracticeAccent } from '@/constants/practice-visuals';
import {
  buildDescription,
  NOT_STARTED_LABEL,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  START_LABEL,
  TITLE,
} from './GeneralPracticeCard.constants';
import {
  BADGE_STYLES,
  BOTTOM_SECTION_STYLES,
  CARD_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_STYLES,
  RING_LABEL_STYLES,
  RING_WRAP_STYLES,
  START_BUTTON_STYLES,
  TITLE_STYLES,
  TOP_ROW_STYLES,
  TOP_SECTION_STYLES,
} from './GeneralPracticeCard.styles';

interface GeneralPracticeCardProps {
  accent: PracticeAccent;
  accuracy: number;
  questionsAttempted: number;
  domainsCount: number;
  isStarting?: boolean;
  onStart: () => void;
}

export function GeneralPracticeCard({
  accent,
  accuracy,
  questionsAttempted,
  domainsCount,
  isStarting = false,
  onStart,
}: GeneralPracticeCardProps) {
  const Icon = Zap;
  const badge = getAccuracyBadge(accuracy, questionsAttempted);
  const dash =
    questionsAttempted === 0
      ? '0 999'
      : `${((accuracy / 100) * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`;

  return (
    <div className={`${CARD_STYLES} ${accent.border}`}>
      <div className={TOP_SECTION_STYLES}>
        <div className={TOP_ROW_STYLES}>
          <div className={ICON_TILE_STYLES}>
            <Icon className={`size-[18px] ${accent.text}`} aria-hidden="true" />
          </div>
          <div className={RING_WRAP_STYLES}>
            <svg width="52" height="52" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                stroke="rgb(255 255 255 / 0.06)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                className={accent.stroke}
                strokeWidth="3"
                strokeDasharray={dash}
                strokeLinecap="round"
              />
            </svg>
            <span className={`${RING_LABEL_STYLES} ${accent.text}`}>
              {questionsAttempted === 0 ? '—' : `${accuracy}%`}
            </span>
          </div>
        </div>
        <h3 className={TITLE_STYLES}>{TITLE}</h3>
        <p className={DESCRIPTION_STYLES}>{buildDescription(domainsCount)}</p>
      </div>

      <div className={BOTTOM_SECTION_STYLES}>
        <span className={`${BADGE_STYLES} ${badge.textClass} ${badge.bgClass} ${badge.borderClass}`}>
          {questionsAttempted === 0 ? NOT_STARTED_LABEL : badge.label}
        </span>
        <button
          type="button"
          className={`${START_BUTTON_STYLES} ${accent.button}`}
          onClick={onStart}
          disabled={isStarting}
        >
          {START_LABEL}
        </button>
      </div>
    </div>
  );
}
