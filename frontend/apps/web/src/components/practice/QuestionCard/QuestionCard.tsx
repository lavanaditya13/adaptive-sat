import { Card } from '@workspace/ui/components/card';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { Label } from '@workspace/ui/components/label';
import type { Question } from '@/types/api';
import { CHOICE_COLON } from './QuestionCard.constants';
import {
  CARD_STYLES,
  PROMPT_STYLES,
  CHOICES_CONTAINER_STYLES,
  CHOICE_ITEM_STYLES,
  CHOICE_KEY_STYLES,
  CHOICE_LABEL_STYLES,
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

  return (
    <Card className={CARD_STYLES}>
      <h2 className={PROMPT_STYLES}>{question.prompt}</h2>

      <RadioGroup
        value={selectedAnswer || ''}
        onValueChange={onSelectAnswer}
        className={CHOICES_CONTAINER_STYLES}
      >
        {choicesKeys.map((key) => {
          const choiceText = question.choices[key];
          const choiceId = `choice-${key}`;

          return (
            <div key={key} className={CHOICE_ITEM_STYLES}>
              <RadioGroupItem value={key} id={choiceId} disabled={disabled} />
              <Label htmlFor={choiceId} className={CHOICE_LABEL_STYLES}>
                <span className={CHOICE_KEY_STYLES}>
                  {key}
                  {CHOICE_COLON}
                </span>
                {choiceText}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </Card>
  );
}
