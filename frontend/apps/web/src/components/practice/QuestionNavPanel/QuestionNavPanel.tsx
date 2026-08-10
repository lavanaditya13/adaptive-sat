import { X } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import type { SessionAccent } from '@/components/practice/session-accent';
import {
  CLOSE_LABEL,
  LEGEND_ANSWERED,
  LEGEND_LOCKED,
  LEGEND_SKIPPED,
  PANEL_TITLE,
  QUESTION_TITLE_PREFIX,
  STATE_HINTS,
  type NavItem,
} from './QuestionNavPanel.constants';
import {
  CLOSE_BUTTON_STYLES,
  DOT_ENABLED_STYLES,
  DOT_LOCKED_STYLES,
  DOT_NEUTRAL_STYLES,
  DOT_SKIPPED_STYLES,
  DOT_STYLES,
  GRID_STYLES,
  LEGEND_ITEM_STYLES,
  LEGEND_STYLES,
  LEGEND_SWATCH_STYLES,
  OVERLAY_STYLES,
  PANEL_DESKTOP_STYLES,
  PANEL_SHEET_STYLES,
  TITLE_ROW_STYLES,
  TITLE_STYLES,
} from './QuestionNavPanel.styles';

interface QuestionNavPanelProps {
  open: boolean;
  items: NavItem[];
  accent: SessionAccent;
  /** Renders as a bottom sheet instead of a centred dialog below 900px. */
  isMobile: boolean;
  onSelect: (position: number) => void;
  onClose: () => void;
}

export function QuestionNavPanel({
  open,
  items,
  accent,
  isMobile,
  onSelect,
  onClose,
}: QuestionNavPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className={OVERLAY_STYLES} onClick={onClose} data-testid="question-nav-overlay" />

      <div
        role="dialog"
        aria-label={PANEL_TITLE}
        className={isMobile ? PANEL_SHEET_STYLES : PANEL_DESKTOP_STYLES}
      >
        <div className={TITLE_ROW_STYLES}>
          <p className={TITLE_STYLES}>{PANEL_TITLE}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={CLOSE_LABEL}
            className={CLOSE_BUTTON_STYLES}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className={GRID_STYLES}>
          {items.map((item) => {
            const isLocked = item.state === 'locked';

            return (
              <button
                key={item.position}
                type="button"
                disabled={isLocked}
                onClick={() => onSelect(item.position)}
                title={`${QUESTION_TITLE_PREFIX} ${item.position} — ${STATE_HINTS[item.state]}`}
                aria-current={item.isCurrent ? 'step' : undefined}
                className={cn(
                  DOT_STYLES,
                  isLocked ? DOT_LOCKED_STYLES : DOT_ENABLED_STYLES,
                  item.state === 'answered' &&
                    cn(accent.solidBg, accent.solidBorder, 'text-white'),
                  item.state === 'skipped' && DOT_SKIPPED_STYLES,
                  item.state === 'unanswered' && DOT_NEUTRAL_STYLES,
                  item.isCurrent && cn('border-2', accent.lightBorder)
                )}
              >
                {item.position}
              </button>
            );
          })}
        </div>

        <div className={LEGEND_STYLES}>
          <span className={LEGEND_ITEM_STYLES}>
            <span className={cn(LEGEND_SWATCH_STYLES, accent.solidBg)} aria-hidden="true" />
            {LEGEND_ANSWERED}
          </span>
          <span className={LEGEND_ITEM_STYLES}>
            <span className={cn(LEGEND_SWATCH_STYLES, 'bg-warning')} aria-hidden="true" />
            {LEGEND_SKIPPED}
          </span>
          <span className={LEGEND_ITEM_STYLES}>
            <span className={cn(LEGEND_SWATCH_STYLES, 'bg-white/20')} aria-hidden="true" />
            {LEGEND_LOCKED}
          </span>
        </div>
      </div>
    </>
  );
}
