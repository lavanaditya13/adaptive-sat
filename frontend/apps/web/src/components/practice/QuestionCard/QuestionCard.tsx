import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { OPTION_LABELS, type SessionAccent } from '@/components/practice/session-accent';
import type { Question } from '@/types/api';
import {
  CORRECT_LABEL,
  EXPLANATION_TITLE,
  INCORRECT_LABEL,
  type QuestionFeedback,
} from './QuestionCard.constants';
import {
  EXPLANATION_BODY_STYLES,
  EXPLANATION_STYLES,
  EXPLANATION_TITLE_STYLES,
  OPTION_BADGE_CORRECT_STYLES,
  OPTION_BADGE_STYLES,
  OPTION_BADGE_UNSELECTED_STYLES,
  OPTION_BADGE_WRONG_STYLES,
  OPTION_CORRECT_STYLES,
  OPTION_STYLES,
  OPTION_TEXT_SELECTED_STYLES,
  OPTION_TEXT_STYLES,
  OPTION_UNSELECTED_STYLES,
  OPTION_WRONG_STYLES,
  OPTIONS_CONTAINER_STYLES,
  PROMPT_STYLES,
  TOPIC_LABEL_STYLES,
  VERDICT_CORRECT_STYLES,
  VERDICT_INCORRECT_STYLES,
  VERDICT_ROW_STYLES,
} from './QuestionCard.styles';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  accent: SessionAccent;
  disabled?: boolean;
  /** Present only once the correct answer is known (review of a graded question). */
  feedback?: QuestionFeedback;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  accent,
  disabled = false,
  feedback,
}: QuestionCardProps) {
  const labels = OPTION_LABELS.filter((label) => label in question.choices);
  const isCorrect = feedback ? selectedAnswer === feedback.correctAnswer : false;

  return (
    <div>
      <span className={cn(TOPIC_LABEL_STYLES, accent.text)}>{question.topic_display_name}</span>
      <p className={PROMPT_STYLES}>{question.prompt}</p>

      <div className={OPTIONS_CONTAINER_STYLES}>
        {labels.map((label) => {
          const isSelected = selectedAnswer === label;
          const isRightAnswer = feedback ? feedback.correctAnswer === label : false;
          const isWrongPick = Boolean(feedback) && isSelected && !isRightAnswer;

          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAnswer(label)}
              aria-pressed={isSelected}
              className={cn(
                OPTION_STYLES,
                isSelected && !feedback && cn(accent.solidBorder, accent.softBg),
                (!isSelected || feedback) && OPTION_UNSELECTED_STYLES,
                isRightAnswer && OPTION_CORRECT_STYLES,
                isWrongPick && OPTION_WRONG_STYLES
              )}
            >
              <span
                className={cn(
                  OPTION_BADGE_STYLES,
                  isSelected && !feedback
                    ? cn(accent.solidBg, 'text-white')
                    : OPTION_BADGE_UNSELECTED_STYLES,
                  isRightAnswer && OPTION_BADGE_CORRECT_STYLES,
                  isWrongPick && OPTION_BADGE_WRONG_STYLES
                )}
              >
                {label}
              </span>
              <span className={isSelected ? OPTION_TEXT_SELECTED_STYLES : OPTION_TEXT_STYLES}>
                {question.choices[label]}
              </span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <>
          <p
            className={cn(
              VERDICT_ROW_STYLES,
              isCorrect ? VERDICT_CORRECT_STYLES : VERDICT_INCORRECT_STYLES
            )}
          >
            {isCorrect ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <XCircle className="size-4" aria-hidden="true" />
            )}
            {isCorrect ? CORRECT_LABEL : INCORRECT_LABEL}
          </p>

          {feedback.explanation && (
            <div className={EXPLANATION_STYLES}>
              <p className={EXPLANATION_TITLE_STYLES}>{EXPLANATION_TITLE}</p>
              <p className={EXPLANATION_BODY_STYLES}>{feedback.explanation}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
