import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@workspace/ui/components/accordion';
import { cn } from '@workspace/ui/lib/utils';
import { getSectionTheme } from '@/constants/section-theme';
import type { QuestionBreakdownItem } from '@/types/api';
import {
  TITLE,
  CORRECT_BADGE_TEXT,
  INCORRECT_BADGE_TEXT,
  EXPLANATION_TITLE,
  NO_EXPLANATION_TEXT,
  CONFIDENCE_PREFIX,
  CONFIDENCE_SUFFIX,
} from './QuestionBreakdownList.constants';
import {
  TITLE_STYLES,
  TRIGGER_TOPIC_STYLES,
  TRIGGER_PROMPT_STYLES,
  TRIGGER_LEFT_STYLES,
  TRIGGER_RIGHT_STYLES,
  BADGE_CORRECT_STYLES,
  BADGE_INCORRECT_STYLES,
  CHOICES_LIST_STYLES,
  CHOICE_ROW_STYLES,
  CHOICE_ROW_CORRECT_STYLES,
  CHOICE_ROW_INCORRECT_STYLES,
  CHOICE_BADGE_STYLES,
  EXPLANATION_BOX_STYLES,
  EXPLANATION_TITLE_STYLES,
  EXPLANATION_TEXT_STYLES,
  CONFIDENCE_TEXT_STYLES,
} from './QuestionBreakdownList.styles';

interface QuestionBreakdownListProps {
  items: QuestionBreakdownItem[];
  section: string | null;
}

export function QuestionBreakdownList({ items, section }: QuestionBreakdownListProps) {
  const theme = getSectionTheme(section ?? '');

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className={TITLE_STYLES}>{TITLE}</p>

      <Accordion className="mt-3">
        {items.map((item) => {
          const choiceKeys = Object.keys(item.choices) as Array<'A' | 'B' | 'C' | 'D'>;

          return (
            <AccordionItem key={item.question_id} value={item.question_id}>
              <AccordionTrigger>
                <div className={TRIGGER_LEFT_STYLES}>
                  <span className={cn(TRIGGER_TOPIC_STYLES, theme.text)}>
                    {item.topic_display_name}
                  </span>
                  <p className={TRIGGER_PROMPT_STYLES}>{item.prompt}</p>
                </div>
                <span
                  className={cn(
                    TRIGGER_RIGHT_STYLES,
                    item.is_correct ? BADGE_CORRECT_STYLES : BADGE_INCORRECT_STYLES
                  )}
                >
                  {item.is_correct ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {item.is_correct ? CORRECT_BADGE_TEXT : INCORRECT_BADGE_TEXT}
                </span>
              </AccordionTrigger>

              <AccordionContent>
                <div className={CHOICES_LIST_STYLES}>
                  {choiceKeys.map((key) => {
                    const isCorrectChoice = key === item.correct_answer;
                    const isSelectedWrongChoice =
                      key === item.selected_answer && key !== item.correct_answer;

                    return (
                      <div
                        key={key}
                        className={cn(
                          CHOICE_ROW_STYLES,
                          isCorrectChoice && CHOICE_ROW_CORRECT_STYLES,
                          isSelectedWrongChoice && CHOICE_ROW_INCORRECT_STYLES
                        )}
                      >
                        <span className={CHOICE_BADGE_STYLES}>{key}</span>
                        <span className="flex-1">{item.choices[key]}</span>
                        {isCorrectChoice && <CheckCircle2 className="size-4 shrink-0" />}
                        {isSelectedWrongChoice && <XCircle className="size-4 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                <div className={EXPLANATION_BOX_STYLES}>
                  <p className={EXPLANATION_TITLE_STYLES}>{EXPLANATION_TITLE}</p>
                  <p className={EXPLANATION_TEXT_STYLES}>
                    {item.explanation ?? NO_EXPLANATION_TEXT}
                  </p>
                </div>

                {item.confidence_level !== null && (
                  <p className={CONFIDENCE_TEXT_STYLES}>
                    {CONFIDENCE_PREFIX}
                    {item.confidence_level}
                    {CONFIDENCE_SUFFIX}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
