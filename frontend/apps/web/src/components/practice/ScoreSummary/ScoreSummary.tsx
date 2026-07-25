import { Card } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import { Badge } from '@workspace/ui/components/badge';
import type { CompleteResponse } from '@/types/api';
import {
  SUMMARY_TITLE,
  ACCURACY_LABEL,
  SCORE_LABEL,
  SLASH_SEPARATOR,
  PERCENT_SUFFIX,
  ADAPTIVE_UNLOCKED_TITLE,
  ADAPTIVE_PROGRESS_TITLE,
  SESSIONS_PROGRESS_SUFFIX,
  UNLOCKED_BADGE_TEXT,
} from './ScoreSummary.constants';
import {
  CARD_STYLES,
  TITLE_STYLES,
  STATS_GRID_STYLES,
  STAT_BOX_STYLES,
  STAT_VALUE_STYLES,
  STAT_LABEL_STYLES,
  UNLOCK_CONTAINER_STYLES,
  UNLOCK_TITLE_STYLES,
  UNLOCK_PROGRESS_TEXT,
} from './ScoreSummary.styles';

interface ScoreSummaryProps {
  result: CompleteResponse;
}

export function ScoreSummary({ result }: ScoreSummaryProps) {
  const { score, adaptive_unlock } = result;

  return (
    <Card className={CARD_STYLES}>
      <h2 className={TITLE_STYLES}>{SUMMARY_TITLE}</h2>

      <div className={STATS_GRID_STYLES}>
        <div className={STAT_BOX_STYLES}>
          <p className={STAT_VALUE_STYLES}>
            {score.percentage}
            {PERCENT_SUFFIX}
          </p>
          <p className={STAT_LABEL_STYLES}>{ACCURACY_LABEL}</p>
        </div>

        <div className={STAT_BOX_STYLES}>
          <p className={STAT_VALUE_STYLES}>
            {score.correct}
            {SLASH_SEPARATOR}
            {score.total}
          </p>
          <p className={STAT_LABEL_STYLES}>{SCORE_LABEL}</p>
        </div>
      </div>

      {adaptive_unlock && (
        <div className={UNLOCK_CONTAINER_STYLES}>
          <div className={UNLOCK_TITLE_STYLES}>
            {adaptive_unlock.is_unlocked ? (
              <>
                <span>{ADAPTIVE_UNLOCKED_TITLE}</span>
                <Badge variant="default">{UNLOCKED_BADGE_TEXT}</Badge>
              </>
            ) : (
              <span>{ADAPTIVE_PROGRESS_TITLE}</span>
            )}
          </div>

          <Progress
            value={
              adaptive_unlock.required_sessions > 0
                ? (adaptive_unlock.completed_sessions / adaptive_unlock.required_sessions) * 100
                : 100
            }
          />

          <p className={UNLOCK_PROGRESS_TEXT}>
            {adaptive_unlock.completed_sessions}
            {SLASH_SEPARATOR}
            {adaptive_unlock.required_sessions}
            {SESSIONS_PROGRESS_SUFFIX}
          </p>
        </div>
      )}
    </Card>
  );
}
