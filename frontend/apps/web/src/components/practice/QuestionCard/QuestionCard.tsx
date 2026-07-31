import { Card } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';
import { getSectionTheme } from '@/constants/section-theme';
import type { Question } from '@/types/api';
import {
  CARD_STYLES,
  TOPIC_LABEL_STYLES,
  PROMPT_STYLES,
  CHOICES_CONTAINER_STYLES,
  CHOICE_ROW_STYLES,
  CHOICE_ROW_SELECTED_STYLES,
  CHOICE_BADGE_STYLES,
  CHOICE_BADGE_SELECTED_STYLES,
  CHOICE_TEXT_STYLES,
} from './QuestionCard.styles';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
}: QuestionCardProps) {
  const choicesKeys = Object.keys(question.choices) as Array<'A' | 'B' | 'C' | 'D'>;
  const theme = getSectionTheme(question.section);

  return (
    <Card className={CARD_STYLES}>
      <span className={cn(TOPIC_LABEL_STYLES, theme.text)}>{question.topic_display_name}</span>
      <h2 className={PROMPT_STYLES}>{question.prompt}</h2>

      <div className={CHOICES_CONTAINER_STYLES}>
        {choicesKeys.map((key) => {
          const isSelected = selectedAnswer === key;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAnswer(key)}
              aria-pressed={isSelected}
              className={cn(CHOICE_ROW_STYLES, isSelected && CHOICE_ROW_SELECTED_STYLES)}
            >
              <span
                className={cn(CHOICE_BADGE_STYLES, isSelected && CHOICE_BADGE_SELECTED_STYLES)}
              >
                {key}
              </span>
              <span className={CHOICE_TEXT_STYLES}>{question.choices[key]}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
