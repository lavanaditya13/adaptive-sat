import { Progress } from '@workspace/ui/components/progress';
import { QUESTION_PREFIX, OF_TEXT, COMPLETED_PERCENT_SUFFIX } from './ProgressBar.constants';
import {
  CONTAINER_STYLES,
  HEADER_STYLES,
  QUESTION_COUNTER_STYLES,
  PERCENT_TEXT_STYLES,
} from './ProgressBar.styles';

interface ProgressBarProps {
  currentPosition: number;
  totalQuestions: number;
}

export function ProgressBar({ currentPosition, totalQuestions }: ProgressBarProps) {
  const percentage =
    totalQuestions > 0 ? Math.round((currentPosition / totalQuestions) * 100) : 0;

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <span className={QUESTION_COUNTER_STYLES}>
          {QUESTION_PREFIX}
          {currentPosition}
          {OF_TEXT}
          {totalQuestions}
        </span>
        <span className={PERCENT_TEXT_STYLES}>
          {percentage}
          {COMPLETED_PERCENT_SUFFIX}
        </span>
      </div>

      <Progress value={percentage} />
    </div>
  );
}
