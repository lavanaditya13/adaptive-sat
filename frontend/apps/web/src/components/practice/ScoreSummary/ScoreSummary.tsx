import { Card } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import { Badge } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';
import { getSectionTheme } from '@/constants/section-theme';
import type { CompleteResponse } from '@/types/api';
import {
  SLASH_SEPARATOR,
  PERCENT_SUFFIX,
  CORRECT_LABEL,
  INCORRECT_LABEL,
  AVG_CONFIDENCE_LABEL,
  NOT_AVAILABLE,
  ACCURACY_SEPARATOR,
  ACCURACY_SUFFIX,
  ADAPTIVE_UNLOCKED_TITLE,
  ADAPTIVE_PROGRESS_TITLE,
  SESSIONS_PROGRESS_SUFFIX,
  UNLOCKED_BADGE_TEXT,
  getEncouragement,
} from './ScoreSummary.constants';
import {
  CARD_STYLES,
  SCORE_STYLES,
  ENCOURAGEMENT_STYLES,
  SUBTITLE_STYLES,
  STATS_GRID_STYLES,
  STAT_BOX_STYLES,
  STAT_VALUE_STYLES,
  STAT_VALUE_CORRECT_STYLES,
  STAT_VALUE_INCORRECT_STYLES,
  STAT_LABEL_STYLES,
  UNLOCK_CONTAINER_STYLES,
  UNLOCK_TITLE_STYLES,
  UNLOCK_PROGRESS_TEXT,
} from './ScoreSummary.styles';

interface ScoreSummaryProps {
  result: CompleteResponse;
}

export function ScoreSummary({ result }: ScoreSummaryProps) {
  const { score, adaptive_unlock, average_confidence, section, section_display_name } = result;
  const theme = getSectionTheme(section ?? '');

  return (
    <Card className={cn(CARD_STYLES, theme.bgSoft)}>
      <div>
        <p className={SCORE_STYLES}>
          {score.correct}
          {SLASH_SEPARATOR}
          {score.total}
        </p>
        <p className={cn(ENCOURAGEMENT_STYLES, theme.text)}>{getEncouragement(score.percentage)}</p>
        {section_display_name && (
          <p className={SUBTITLE_STYLES}>
            {section_display_name}
            {ACCURACY_SEPARATOR}
            {score.percentage}
            {PERCENT_SUFFIX}
            {ACCURACY_SUFFIX}
          </p>
        )}
      </div>

      <div className={STATS_GRID_STYLES}>
        <div className={STAT_BOX_STYLES}>
          <p className={cn(STAT_VALUE_STYLES, STAT_VALUE_CORRECT_STYLES)}>{score.correct}</p>
          <p className={STAT_LABEL_STYLES}>{CORRECT_LABEL}</p>
        </div>
        <div className={STAT_BOX_STYLES}>
          <p className={cn(STAT_VALUE_STYLES, STAT_VALUE_INCORRECT_STYLES)}>{score.incorrect}</p>
          <p className={STAT_LABEL_STYLES}>{INCORRECT_LABEL}</p>
        </div>
        <div className={STAT_BOX_STYLES}>
          <p className={STAT_VALUE_STYLES}>
            {average_confidence !== null && average_confidence !== undefined
              ? average_confidence
              : NOT_AVAILABLE}
          </p>
          <p className={STAT_LABEL_STYLES}>{AVG_CONFIDENCE_LABEL}</p>
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
