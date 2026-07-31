import { ChevronRight } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import type { PracticeOption } from '@/types/api';
import {
  LOCKED_BADGE_TEXT,
  SESSIONS_SUFFIX,
  SLASH_SEPARATOR,
  QUESTION_COUNT_SEPARATOR,
  QUESTIONS_SUFFIX,
} from './PracticeOptionCard.constants';
import {
  ROW_UNLOCKED_STYLES,
  ROW_LOCKED_STYLES,
  HEADER_CONTAINER_STYLES,
  TITLE_STYLES,
  DESCRIPTION_STYLES,
  REQUIREMENT_STYLES,
} from './PracticeOptionCard.styles';

interface PracticeOptionCardProps {
  option: PracticeOption;
  onStart: (mode: PracticeOption['mode']) => void;
  isLoading?: boolean;
}

export function PracticeOptionCard({ option, onStart, isLoading = false }: PracticeOptionCardProps) {
  const isLocked = option.is_locked;

  return (
    <button
      type="button"
      disabled={isLocked || isLoading}
      onClick={() => onStart(option.mode)}
      className={isLocked ? ROW_LOCKED_STYLES : ROW_UNLOCKED_STYLES}
    >
      <div>
        <div className={HEADER_CONTAINER_STYLES}>
          <h3 className={TITLE_STYLES}>{option.title}</h3>
          {isLocked && <Badge variant="secondary">{LOCKED_BADGE_TEXT}</Badge>}
        </div>
        <p className={DESCRIPTION_STYLES}>
          {option.description}
          {QUESTION_COUNT_SEPARATOR}
          {option.question_count}
          {QUESTIONS_SUFFIX}
        </p>
        {isLocked && option.unlock_requirement && (
          <p className={REQUIREMENT_STYLES}>
            {option.unlock_requirement.completed_sessions}
            {SLASH_SEPARATOR}
            {option.unlock_requirement.required_sessions}
            {SESSIONS_SUFFIX}
          </p>
        )}
      </div>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
