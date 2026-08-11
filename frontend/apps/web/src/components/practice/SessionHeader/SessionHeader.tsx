import { LayoutGrid } from 'lucide-react';
import {
  NAV_PILL_STYLES,
  RIGHT_GROUP_STYLES,
  ROW_STYLES,
  TIMER_DOT_STYLES,
  TIMER_PILL_STYLES,
  TIMER_TEXT_STYLES,
} from './SessionHeader.styles';

interface SessionHeaderProps {
  questionLabel: string;
  questionTime: string;
  sessionTime: string;
  totalSuffix: string;
  /** Section accent classes so the timer matches the subject being practised. */
  accentText: string;
  accentBorder: string;
  accentTint: string;
  accentDot: string;
  onOpenNav: () => void;
}

export function SessionHeader({
  questionLabel,
  questionTime,
  sessionTime,
  totalSuffix,
  accentText,
  accentBorder,
  accentTint,
  accentDot,
  onOpenNav,
}: SessionHeaderProps) {
  return (
    <div className={ROW_STYLES}>
      <button type="button" className={NAV_PILL_STYLES} onClick={onOpenNav}>
        {questionLabel}
        <LayoutGrid className="size-3" aria-hidden="true" />
      </button>

      <div className={RIGHT_GROUP_STYLES}>
        <span className="font-mono text-[11px] text-ink-muted">
          {sessionTime} {totalSuffix}
        </span>
        <div className={`${TIMER_PILL_STYLES} ${accentBorder} ${accentTint}`}>
          <span className={`${TIMER_DOT_STYLES} ${accentDot}`} aria-hidden="true" />
          <span className={`${TIMER_TEXT_STYLES} ${accentText}`}>{questionTime}</span>
        </div>
      </div>
    </div>
  );
}
