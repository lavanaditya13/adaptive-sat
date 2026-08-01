import { Card } from '@workspace/ui/components/card';
import type { EstimatedScore } from '@/types/api';
import { TITLE, TARGET_PREFIX, POINTS_TO_GO_SUFFIX, GOAL_MET_TEXT, RING_CAPTION } from './EstimatedScoreCard.constants';
import {
  CARD_STYLES,
  TITLE_STYLES,
  SCORE_STYLES,
  DETAIL_STYLES,
  TARGET_VALUE_STYLES,
  RING_WRAPPER_STYLES,
  RING_TRACK_STYLES,
  RING_PROGRESS_STYLES,
  RING_LABEL_STYLES,
  RING_PERCENT_STYLES,
  RING_CAPTION_STYLES,
} from './EstimatedScoreCard.styles';

interface EstimatedScoreCardProps {
  estimatedScore: EstimatedScore;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function EstimatedScoreCard({ estimatedScore }: EstimatedScoreCardProps) {
  const { estimated_score, target_score, points_to_go, percent_to_goal } = estimatedScore;
  const offset = CIRCUMFERENCE * (1 - percent_to_goal / 100);

  return (
    <Card className={CARD_STYLES}>
      <div>
        <p className={TITLE_STYLES}>{TITLE}</p>
        <p className={SCORE_STYLES}>{estimated_score}</p>
        <p className={DETAIL_STYLES}>
          {TARGET_PREFIX}
          <span className={TARGET_VALUE_STYLES}>{target_score}</span>
          {points_to_go > 0 ? ` · ${points_to_go}${POINTS_TO_GO_SUFFIX}` : ` · ${GOAL_MET_TEXT}`}
        </p>
      </div>

      <div className={RING_WRAPPER_STYLES}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className={RING_TRACK_STYLES}
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={RING_PROGRESS_STYLES}
          />
        </svg>
        <div className={RING_LABEL_STYLES}>
          <span className={RING_PERCENT_STYLES}>{Math.round(percent_to_goal)}%</span>
          <span className={RING_CAPTION_STYLES}>{RING_CAPTION}</span>
        </div>
      </div>
    </Card>
  );
}
