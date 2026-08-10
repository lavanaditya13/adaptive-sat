import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import type { SessionAccent } from '@/components/practice/session-accent';
import { PREVIOUS_LABEL, SKIP_LABEL, SUBMITTING_LABEL } from './SessionNavigation.constants';
import {
  ACTIONS_STYLES,
  FOOTER_STYLES,
  NEXT_BUTTON_STYLES,
  PREVIOUS_BUTTON_STYLES,
  PREVIOUS_DISABLED_STYLES,
  SKIP_BUTTON_STYLES,
} from './SessionNavigation.styles';

interface SessionNavigationProps {
  hasPrevious: boolean;
  canGoNext: boolean;
  showSkip: boolean;
  nextLabel: string;
  isSubmitting: boolean;
  accent: SessionAccent;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export function SessionNavigation({
  hasPrevious,
  canGoNext,
  showSkip,
  nextLabel,
  isSubmitting,
  accent,
  onPrevious,
  onSkip,
  onNext,
}: SessionNavigationProps) {
  return (
    <div className={FOOTER_STYLES}>
      {hasPrevious ? (
        <button type="button" onClick={onPrevious} className={PREVIOUS_BUTTON_STYLES}>
          <ArrowLeft className="size-[15px]" aria-hidden="true" />
          {PREVIOUS_LABEL}
        </button>
      ) : (
        <span className={PREVIOUS_DISABLED_STYLES} aria-hidden="true">
          {PREVIOUS_LABEL}
        </span>
      )}

      <div className={ACTIONS_STYLES}>
        {showSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className={SKIP_BUTTON_STYLES}
          >
            {SKIP_LABEL}
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className={cn(NEXT_BUTTON_STYLES, accent.buttonBg)}
        >
          {isSubmitting ? SUBMITTING_LABEL : nextLabel}
          {!isSubmitting && <ArrowRight className="size-[15px]" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
