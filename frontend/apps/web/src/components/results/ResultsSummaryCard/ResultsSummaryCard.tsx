import { getSectionTheme } from '@/constants/section-theme';
import type { CompleteResponse } from '@/types/api';
import {
  ACCURACY_BADGE_CLASSES,
  formatAverageConfidence,
  formatDuration,
  getAccuracyTier,
} from '../resultsFormat';
import {
  CORRECT_LABEL,
  INCORRECT_LABEL,
  AVG_CONFIDENCE_LABEL,
  TIME_TAKEN_LABEL,
  EXCELLENT_HEADING,
  GOOD_HEADING,
  KEEP_PRACTICING_HEADING,
  ACCURACY_SUFFIX,
} from './ResultsSummaryCard.constants';
import {
  CARD_STYLES,
  SCORE_STYLES,
  HEADING_STYLES,
  SUBTITLE_ROW_STYLES,
  SUBTITLE_TEXT_STYLES,
  BADGE_STYLES,
  STAT_ROW_STYLES,
  STAT_STYLES,
  STAT_VALUE_STYLES,
  STAT_LABEL_STYLES,
  DIVIDER_STYLES,
} from './ResultsSummaryCard.styles';

interface ResultsSummaryCardProps {
  result: CompleteResponse;
  timeTakenSeconds: number;
}

function getHeading(percentage: number): string {
  if (percentage >= 80) return EXCELLENT_HEADING;
  if (percentage >= 60) return GOOD_HEADING;
  return KEEP_PRACTICING_HEADING;
}

export function ResultsSummaryCard({ result, timeTakenSeconds }: ResultsSummaryCardProps) {
  const { score, average_confidence: averageConfidence, section, section_display_name: sectionDisplayName } =
    result;
  const theme = getSectionTheme(section ?? '');
  const tier = getAccuracyTier(score.percentage);

  return (
    <div className={`${CARD_STYLES} ${theme.bgSoft} ${theme.border}`}>
      <p className={`${SCORE_STYLES} ${theme.text}`}>
        {score.correct}/{score.total}
      </p>
      <p className={HEADING_STYLES}>{getHeading(score.percentage)}</p>
      <div className={SUBTITLE_ROW_STYLES}>
        {sectionDisplayName && <span className={SUBTITLE_TEXT_STYLES}>{sectionDisplayName}</span>}
        <span className={`${BADGE_STYLES} ${ACCURACY_BADGE_CLASSES[tier]}`}>
          {score.percentage}% {ACCURACY_SUFFIX}
        </span>
      </div>

      <div className={STAT_ROW_STYLES}>
        <div className={STAT_STYLES}>
          <p className={`${STAT_VALUE_STYLES} text-success`}>{score.correct}</p>
          <p className={STAT_LABEL_STYLES}>{CORRECT_LABEL}</p>
        </div>
        <div className={DIVIDER_STYLES} />
        <div className={STAT_STYLES}>
          <p className={`${STAT_VALUE_STYLES} text-danger`}>{score.incorrect}</p>
          <p className={STAT_LABEL_STYLES}>{INCORRECT_LABEL}</p>
        </div>
        <div className={DIVIDER_STYLES} />
        <div className={STAT_STYLES}>
          <p className={STAT_VALUE_STYLES}>{formatAverageConfidence(averageConfidence)}</p>
          <p className={STAT_LABEL_STYLES}>{AVG_CONFIDENCE_LABEL}</p>
        </div>
        <div className={DIVIDER_STYLES} />
        <div className={STAT_STYLES}>
          <p className={STAT_VALUE_STYLES}>{formatDuration(timeTakenSeconds)}</p>
          <p className={STAT_LABEL_STYLES}>{TIME_TAKEN_LABEL}</p>
        </div>
      </div>
    </div>
  );
}
