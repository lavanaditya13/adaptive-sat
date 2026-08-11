import { LayoutGrid, Pause, Play } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { ProgressBar } from '@/components/practice/ProgressBar/ProgressBar';
import type { SegmentState } from '@/components/practice/ProgressBar/ProgressBar.constants';
import { formatClock, type SessionAccent } from '@/components/practice/session-accent';
import {
  LIVE_TIMER_LABEL,
  NAV_PILL_PREFIX,
  NAV_PILL_SEPARATOR,
  OPEN_NAV_LABEL,
  PAUSE_LABEL,
  QUESTION_COUNTER_JOINER,
  QUESTION_COUNTER_PREFIX,
  RESUME_LABEL,
  SESSION_TIMER_LABEL,
  TOTAL_SUFFIX,
} from './SessionHeader.constants';
import {
  COUNTER_ROW_STYLES,
  COUNTER_STYLES,
  HEADER_STYLES,
  NAV_PILL_STYLES,
  PAUSE_BUTTON_STYLES,
  SESSION_TIME_STYLES,
  TIMER_DOT_PAUSED_STYLES,
  TIMER_DOT_STYLES,
  TIMER_PILL_STYLES,
  TIMER_VALUE_STYLES,
  TIMERS_ROW_STYLES,
  TOP_ROW_STYLES,
} from './SessionHeader.styles';

interface SessionHeaderProps {
  /** 1-based position of the question on screen. */
  currentPosition: number;
  totalQuestions: number;
  questionSeconds: number;
  sessionSeconds: number;
  segments: SegmentState[];
  accent: SessionAccent;
  isPaused: boolean;
  onOpenNav: () => void;
  onTogglePause: () => void;
}

export function SessionHeader({
  currentPosition,
  totalQuestions,
  questionSeconds,
  sessionSeconds,
  segments,
  accent,
  isPaused,
  onOpenNav,
  onTogglePause,
}: SessionHeaderProps) {
  return (
    <div className={HEADER_STYLES}>
      <div className={TOP_ROW_STYLES}>
        <button
          type="button"
          onClick={onOpenNav}
          aria-label={OPEN_NAV_LABEL}
          className={NAV_PILL_STYLES}
        >
          {NAV_PILL_PREFIX} {currentPosition}
          {NAV_PILL_SEPARATOR}
          {totalQuestions}
          <LayoutGrid className="size-3" aria-hidden="true" />
        </button>

        <div className={TIMERS_ROW_STYLES}>
          <span className={SESSION_TIME_STYLES} aria-label={SESSION_TIMER_LABEL}>
            {formatClock(sessionSeconds)} {TOTAL_SUFFIX}
          </span>

          <div className={cn(TIMER_PILL_STYLES, accent.softBg, accent.tintBorder)}>
            <span
              className={
                isPaused ? TIMER_DOT_PAUSED_STYLES : cn(TIMER_DOT_STYLES, accent.solidBg)
              }
              aria-hidden="true"
            />
            <span className={cn(TIMER_VALUE_STYLES, accent.text)} aria-label={LIVE_TIMER_LABEL}>
              {formatClock(questionSeconds)}
            </span>
          </div>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? RESUME_LABEL : PAUSE_LABEL}
            className={PAUSE_BUTTON_STYLES}
          >
            {isPaused ? (
              <Play className="size-[13px]" aria-hidden="true" />
            ) : (
              <Pause className="size-[13px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className={COUNTER_ROW_STYLES}>
        <span className={COUNTER_STYLES}>
          {QUESTION_COUNTER_PREFIX} {currentPosition} {QUESTION_COUNTER_JOINER} {totalQuestions}
        </span>
      </div>

      <ProgressBar segments={segments} currentPosition={currentPosition} accent={accent} />
    </div>
  );
}
