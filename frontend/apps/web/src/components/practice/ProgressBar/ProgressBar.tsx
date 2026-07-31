import { Progress } from '@workspace/ui/components/progress';
import { BAR_STYLES } from './ProgressBar.styles';

interface ProgressBarProps {
  currentPosition: number;
  totalQuestions: number;
}

export function ProgressBar({ currentPosition, totalQuestions }: ProgressBarProps) {
  const percentage =
    totalQuestions > 0 ? Math.round((currentPosition / totalQuestions) * 100) : 0;

  return <Progress value={percentage} className={BAR_STYLES} />;
}
