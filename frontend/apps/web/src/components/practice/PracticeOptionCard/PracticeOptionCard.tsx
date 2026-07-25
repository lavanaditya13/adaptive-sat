import { Card } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import type { PracticeOption } from '@/types/api';
import {
  START_BUTTON_TEXT,
  LOCKED_BADGE_TEXT,
  SESSIONS_SUFFIX,
  SLASH_SEPARATOR,
  STARTING_TEXT,
} from './PracticeOptionCard.constants';
import {
  CARD_UNLOCKED_STYLES,
  CARD_LOCKED_STYLES,
  HEADER_CONTAINER_STYLES,
  TITLE_STYLES,
  DESCRIPTION_STYLES,
  REQUIREMENT_STYLES,
  FOOTER_STYLES,
} from './PracticeOptionCard.styles';

interface PracticeOptionCardProps {
  option: PracticeOption;
  onStart: (mode: PracticeOption['mode']) => void;
  isLoading?: boolean;
}

export function PracticeOptionCard({ option, onStart, isLoading = false }: PracticeOptionCardProps) {
  const isLocked = option.is_locked;

  return (
    <Card className={isLocked ? CARD_LOCKED_STYLES : CARD_UNLOCKED_STYLES}>
      <div>
        <div className={HEADER_CONTAINER_STYLES}>
          <h3 className={TITLE_STYLES}>{option.title}</h3>
          {isLocked && <Badge variant="secondary">{LOCKED_BADGE_TEXT}</Badge>}
        </div>
        <p className={DESCRIPTION_STYLES}>{option.description}</p>
        {isLocked && option.unlock_requirement && (
          <p className={REQUIREMENT_STYLES}>
            {option.unlock_requirement.completed_sessions}
            {SLASH_SEPARATOR}
            {option.unlock_requirement.required_sessions}
            {SESSIONS_SUFFIX}
          </p>
        )}
      </div>

      <div className={FOOTER_STYLES}>
        <Button
          disabled={isLocked || isLoading}
          onClick={() => onStart(option.mode)}
        >
          {isLoading ? STARTING_TEXT : START_BUTTON_TEXT}
        </Button>
      </div>
    </Card>
  );
}
