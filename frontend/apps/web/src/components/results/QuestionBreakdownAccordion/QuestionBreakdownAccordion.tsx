import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { formatDuration } from '../resultsFormat';
import type { QuestionBreakdownItem } from '@/types/api';
import {
  SECTION_TITLE,
  EXPLANATION_LABEL,
  NO_EXPLANATION_TEXT,
  OPTION_KEYS,
} from './QuestionBreakdownAccordion.constants';
import {
  SECTION_STYLES,
  SECTION_HEADING_STYLES,
  LIST_STYLES,
  ROW_STYLES,
  ROW_HEADER_STYLES,
  ICON_CIRCLE_CORRECT_STYLES,
  ICON_CIRCLE_INCORRECT_STYLES,
  ROW_BODY_STYLES,
  ROW_TOPIC_STYLES,
  ROW_PROMPT_STYLES,
  ROW_TIME_STYLES,
  PANEL_STYLES,
  PANEL_PROMPT_STYLES,
  OPTIONS_LIST_STYLES,
  OPTION_BASE_STYLES,
  OPTION_CORRECT_STYLES,
  OPTION_WRONG_STYLES,
  OPTION_NEUTRAL_STYLES,
  OPTION_LABEL_CORRECT_STYLES,
  OPTION_LABEL_WRONG_STYLES,
  OPTION_LABEL_NEUTRAL_STYLES,
  EXPLANATION_BOX_STYLES,
  EXPLANATION_HEADING_STYLES,
  EXPLANATION_TEXT_STYLES,
} from './QuestionBreakdownAccordion.styles';

interface QuestionBreakdownAccordionProps {
  items: QuestionBreakdownItem[];
}

export function QuestionBreakdownAccordion({ items }: QuestionBreakdownAccordionProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <section className={SECTION_STYLES}>
      <h2 className={SECTION_HEADING_STYLES}>{SECTION_TITLE}</h2>
      <ul className={LIST_STYLES}>
        {items.map((item) => {
          const isOpen = expandedId === item.question_id;
          return (
            <li key={item.question_id} className={ROW_STYLES}>
              <button
                type="button"
                className={ROW_HEADER_STYLES}
                onClick={() => toggle(item.question_id)}
                aria-expanded={isOpen}
              >
                <div
                  className={item.is_correct ? ICON_CIRCLE_CORRECT_STYLES : ICON_CIRCLE_INCORRECT_STYLES}
                >
                  {item.is_correct ? <Check size={13} /> : <X size={13} />}
                </div>
                <div className={ROW_BODY_STYLES}>
                  <span className={ROW_TOPIC_STYLES}>{item.topic_display_name}</span>
                  <span className={ROW_PROMPT_STYLES}>{item.prompt}</span>
                </div>
                <span className={ROW_TIME_STYLES}>{formatDuration(item.time_spent_seconds ?? 0)}</span>
              </button>

              {isOpen && (
                <div className={PANEL_STYLES}>
                  <p className={PANEL_PROMPT_STYLES}>{item.prompt}</p>
                  <div className={OPTIONS_LIST_STYLES}>
                    {OPTION_KEYS.map((key) => {
                      const text = item.choices[key];
                      if (text === undefined) return null;
                      const isRight = key === item.correct_answer;
                      const isWrongPick = key === item.selected_answer && !isRight;
                      const optionStyles = isRight
                        ? OPTION_CORRECT_STYLES
                        : isWrongPick
                          ? OPTION_WRONG_STYLES
                          : OPTION_NEUTRAL_STYLES;
                      const labelStyles = isRight
                        ? OPTION_LABEL_CORRECT_STYLES
                        : isWrongPick
                          ? OPTION_LABEL_WRONG_STYLES
                          : OPTION_LABEL_NEUTRAL_STYLES;
                      return (
                        <div key={key} className={`${OPTION_BASE_STYLES} ${optionStyles}`}>
                          <span className={labelStyles}>{key}</span>
                          <span className="flex-1">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={EXPLANATION_BOX_STYLES}>
                    <p className={EXPLANATION_HEADING_STYLES}>{EXPLANATION_LABEL}</p>
                    <p className={EXPLANATION_TEXT_STYLES}>{item.explanation ?? NO_EXPLANATION_TEXT}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
