import { cn } from '@workspace/ui/lib/utils';
import type { SessionAccent } from '@/components/practice/session-accent';
import { PROGRESS_LABEL, type SegmentState } from './ProgressBar.constants';
import {
  SEGMENT_CURRENT_STYLES,
  SEGMENT_SKIPPED_STYLES,
  SEGMENT_STYLES,
  SEGMENT_UPCOMING_STYLES,
  TRACK_STYLES,
} from './ProgressBar.styles';

interface ProgressBarProps {
  segments: SegmentState[];
  /** 1-based position currently on screen; gets the accent outline. */
  currentPosition: number;
  accent: SessionAccent;
}

export function ProgressBar({ segments, currentPosition, accent }: ProgressBarProps) {
  const answered = segments.filter((segment) => segment !== 'upcoming').length;

  return (
    <div
      className={TRACK_STYLES}
      role="progressbar"
      aria-label={PROGRESS_LABEL}
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-valuenow={answered}
    >
      {segments.map((segment, index) => (
        <span
          key={index}
          data-state={segment}
          className={cn(
            SEGMENT_STYLES,
            segment === 'answered' && accent.solidBg,
            segment === 'skipped' && SEGMENT_SKIPPED_STYLES,
            segment === 'upcoming' && SEGMENT_UPCOMING_STYLES,
            index + 1 === currentPosition && SEGMENT_CURRENT_STYLES
          )}
        />
      ))}
    </div>
  );
}
