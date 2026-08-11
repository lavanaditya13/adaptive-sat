import {
  ANSWERED_HINT,
  buildDotTitle,
  CURRENT_HINT,
  PANEL_TITLE,
  SKIPPED_HINT,
  UNSEEN_HINT,
} from './QuestionNavPanel.constants';
import {
  DOT_ANSWERED_STYLES,
  DOT_BASE_STYLES,
  DOT_CURRENT_STYLES,
  DOT_SKIPPED_STYLES,
  DOT_UNSEEN_STYLES,
  GRID_STYLES,
  OVERLAY_STYLES,
  PANEL_STYLES,
  TITLE_STYLES,
} from './QuestionNavPanel.styles';

export interface QuestionNavItem {
  position: number;
  answered: boolean;
  skipped: boolean;
  /** False for positions the session has never served; those can still be opened,
   *  the backend hands them over on demand. */
  seen: boolean;
}

interface QuestionNavPanelProps {
  items: QuestionNavItem[];
  currentPosition: number;
  accentSolid: string;
  accentRing: string;
  onSelect: (position: number) => void;
  onClose: () => void;
}

export function QuestionNavPanel({
  items,
  currentPosition,
  accentSolid,
  accentRing,
  onSelect,
  onClose,
}: QuestionNavPanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className={OVERLAY_STYLES}
        onClick={onClose}
      />
      <div className={PANEL_STYLES} role="dialog" aria-label={PANEL_TITLE}>
        <p className={TITLE_STYLES}>{PANEL_TITLE}</p>
        <div className={GRID_STYLES}>
          {items.map((item) => {
            const isCurrent = item.position === currentPosition;
            const hint = isCurrent
              ? CURRENT_HINT
              : item.answered
                ? ANSWERED_HINT
                : item.skipped
                  ? SKIPPED_HINT
                  : UNSEEN_HINT;

            const tone = item.answered
              ? `${DOT_ANSWERED_STYLES} ${accentSolid}`
              : item.skipped
                ? DOT_SKIPPED_STYLES
                : DOT_UNSEEN_STYLES;

            return (
              <button
                key={item.position}
                type="button"
                title={buildDotTitle(item.position, hint)}
                aria-current={isCurrent ? 'true' : undefined}
                className={`${DOT_BASE_STYLES} ${tone} ${isCurrent ? `${DOT_CURRENT_STYLES} ${accentRing}` : ''}`}
                onClick={() => onSelect(item.position)}
              >
                {item.position}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
