import { Card } from '@workspace/ui/components/card';
import { TITLE, NOT_SURE_CAPTION, VERY_CONFIDENT_CAPTION } from './ConfidenceSelector.constants';
import {
  CARD_STYLES,
  TITLE_STYLES,
  BUTTONS_GRID_STYLES,
  LEVEL_BUTTON_UNSELECTED_STYLES,
  LEVEL_BUTTON_SELECTED_STYLES,
  CAPTIONS_ROW_STYLES,
} from './ConfidenceSelector.styles';

interface ConfidenceSelectorProps {
  confidenceLevel: number;
  onSelectConfidence: (level: number) => void;
  disabled?: boolean;
}

const LEVELS = [1, 2, 3, 4, 5];

export function ConfidenceSelector({
  confidenceLevel,
  onSelectConfidence,
  disabled = false,
}: ConfidenceSelectorProps) {
  return (
    <Card className={CARD_STYLES}>
      <span className={TITLE_STYLES}>{TITLE}</span>

      <div className={BUTTONS_GRID_STYLES}>
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onSelectConfidence(level)}
            className={
              confidenceLevel === level
                ? LEVEL_BUTTON_SELECTED_STYLES
                : LEVEL_BUTTON_UNSELECTED_STYLES
            }
          >
            {level}
          </button>
        ))}
      </div>

      <div className={CAPTIONS_ROW_STYLES}>
        <span>{NOT_SURE_CAPTION}</span>
        <span>{VERY_CONFIDENT_CAPTION}</span>
      </div>
    </Card>
  );
}
