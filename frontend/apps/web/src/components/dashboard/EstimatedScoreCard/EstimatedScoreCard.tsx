import type { EstimatedScore } from '@/types/api';
import {
  GOAL_MET_TEXT,
  POINTS_TO_GO_SUFFIX,
  RING_CAPTION,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  RING_STROKE_WIDTH,
  TARGET_PREFIX,
  TITLE,
} from './EstimatedScoreCard.constants';
import {
  CARD_STYLES,
  DETAIL_STYLES,
  RING_CAPTION_STYLES,
  RING_COLUMN_STYLES,
  RING_PERCENT_STYLES,
  RING_PROGRESS_STYLES,
  RING_SVG_STYLES,
  RING_TRACK_STYLES,
  RING_WRAPPER_STYLES,
  SCORE_STYLES,
  TARGET_VALUE_STYLES,
  TITLE_STYLES,
} from './EstimatedScoreCard.styles';

interface EstimatedScoreCardProps {
  estimatedScore: EstimatedScore;
}

export function EstimatedScoreCard({ estimatedScore }: EstimatedScoreCardProps) {
  const { estimated_score, target_score, points_to_go, percent_to_goal } = estimatedScore;
  const clampedPercent = Math.min(100, Math.max(0, percent_to_goal));
  const dash = (clampedPercent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className={CARD_STYLES}>
      <div>
        <p className={TITLE_STYLES}>{TITLE}</p>
        <p className={SCORE_STYLES}>{estimated_score}</p>
        <p className={DETAIL_STYLES}>
          {TARGET_PREFIX}
          <span className={TARGET_VALUE_STYLES}>{target_score}</span>
          {points_to_go > 0 ? ` · ${points_to_go}${POINTS_TO_GO_SUFFIX}` : ` · ${GOAL_MET_TEXT}`}
        </p>
      </div>

      <div className={RING_COLUMN_STYLES}>
        <div className={RING_WRAPPER_STYLES}>
          <svg viewBox="0 0 36 36" className={RING_SVG_STYLES} aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE_WIDTH}
              className={RING_TRACK_STYLES}
            />
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${RING_CIRCUMFERENCE - dash}`}
              className={RING_PROGRESS_STYLES}
            />
          </svg>
          <span className={RING_PERCENT_STYLES}>{Math.round(clampedPercent)}%</span>
        </div>
        <p className={RING_CAPTION_STYLES}>{RING_CAPTION}</p>
      </div>
    </div>
  );
}
