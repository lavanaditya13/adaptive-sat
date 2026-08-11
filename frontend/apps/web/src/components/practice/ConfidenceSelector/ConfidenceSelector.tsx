import { cn } from '@workspace/ui/lib/utils';
import type { SessionAccent } from '@/components/practice/session-accent';
import {
  CONFIDENCE_LEVELS,
  LEVEL_LABEL_PREFIX,
  NOT_SURE_CAPTION,
  TITLE,
  VERY_CONFIDENT_CAPTION,
} from './ConfidenceSelector.constants';
import {
  CAPTION_STYLES,
  CAPTIONS_ROW_STYLES,
  CARD_STYLES,
  LEVEL_BUTTON_SELECTED_STYLES,
  LEVEL_BUTTON_STYLES,
  LEVEL_BUTTON_UNSELECTED_STYLES,
  LEVELS_ROW_STYLES,
  TITLE_STYLES,
} from './ConfidenceSelector.styles';

interface ConfidenceSelectorProps {
  confidenceLevel: number;
  onSelectConfidence: (level: number) => void;
  accent: SessionAccent;
  disabled?: boolean;
}

export function ConfidenceSelector({
  confidenceLevel,
  onSelectConfidence,
  accent,
  disabled = false,
}: ConfidenceSelectorProps) {
  return (
    <div className={CARD_STYLES}>
      <p className={TITLE_STYLES}>{TITLE}</p>

      <div className={LEVELS_ROW_STYLES} role="group" aria-label={TITLE}>
        {CONFIDENCE_LEVELS.map((level) => {
          const isSelected = confidenceLevel === level;

          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${LEVEL_LABEL_PREFIX} ${level}`}
              onClick={() => onSelectConfidence(level)}
              className={cn(
                LEVEL_BUTTON_STYLES,
                isSelected
                  ? cn(LEVEL_BUTTON_SELECTED_STYLES, accent.solidBg)
                  : LEVEL_BUTTON_UNSELECTED_STYLES
              )}
            >
              {level}
            </button>
          );
        })}
      </div>

      <div className={CAPTIONS_ROW_STYLES}>
        <p className={CAPTION_STYLES}>{NOT_SURE_CAPTION}</p>
        <p className={CAPTION_STYLES}>{VERY_CONFIDENT_CAPTION}</p>
      </div>
    </div>
  );
}
