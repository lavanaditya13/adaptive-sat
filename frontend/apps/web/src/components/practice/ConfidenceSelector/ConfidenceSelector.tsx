import { Card } from '@workspace/ui/components/card';
import { Slider } from '@workspace/ui/components/slider';
import { TITLE, LEVEL_DESCRIPTIONS } from './ConfidenceSelector.constants';
import {
  CARD_STYLES,
  LABEL_CONTAINER_STYLES,
  TITLE_STYLES,
  LEVEL_TEXT_STYLES,
  BUTTONS_GRID_STYLES,
  LEVEL_BUTTON_UNSELECTED_STYLES,
  LEVEL_BUTTON_SELECTED_STYLES,
} from './ConfidenceSelector.styles';

interface ConfidenceSelectorProps {
  confidenceLevel: number;
  onSelectConfidence: (level: number) => void;
  disabled?: boolean;
}

export function ConfidenceSelector({
  confidenceLevel,
  onSelectConfidence,
  disabled = false,
}: ConfidenceSelectorProps) {
  const levels = [1, 2, 3, 4, 5];

  return (
    <Card className={CARD_STYLES}>
      <div className={LABEL_CONTAINER_STYLES}>
        <span className={TITLE_STYLES}>{TITLE}</span>
        <span className={LEVEL_TEXT_STYLES}>
          {LEVEL_DESCRIPTIONS[confidenceLevel] || confidenceLevel}
        </span>
      </div>

      <Slider
        min={1}
        max={5}
        step={1}
        value={confidenceLevel}
        onChange={onSelectConfidence}
        disabled={disabled}
      />

      <div className={BUTTONS_GRID_STYLES}>
        {levels.map((level) => (
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
    </Card>
  );
}
