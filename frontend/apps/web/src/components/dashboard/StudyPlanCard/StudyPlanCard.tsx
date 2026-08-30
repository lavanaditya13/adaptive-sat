import type { StudyPlanResponse } from '@/types/api';
import {
  buildQuestionCountCaption,
  DESCRIPTION,
  EMPTY_MESSAGE,
  getPriorityBadge,
  REGENERATE_LABEL,
  REGENERATING_LABEL,
  TITLE,
} from './StudyPlanCard.constants';
import {
  BADGE_STYLES,
  CAPTION_STYLES,
  CARD_STYLES,
  DESCRIPTION_STYLES,
  EMPTY_STYLES,
  HEADER_ROW_STYLES,
  LIST_STYLES,
  NAME_STYLES,
  REASON_STYLES,
  REGENERATE_BUTTON_STYLES,
  ROW_MAIN_STYLES,
  ROW_STYLES,
  TITLE_STYLES,
} from './StudyPlanCard.styles';

interface StudyPlanCardProps {
  plan: StudyPlanResponse;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function StudyPlanCard({ plan, onRegenerate, isRegenerating = false }: StudyPlanCardProps) {
  return (
    <section className={CARD_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <h2 className={TITLE_STYLES}>{TITLE}</h2>
        <button
          type="button"
          className={REGENERATE_BUTTON_STYLES}
          disabled={isRegenerating}
          onClick={onRegenerate}
        >
          {isRegenerating ? REGENERATING_LABEL : REGENERATE_LABEL}
        </button>
      </div>
      <p className={DESCRIPTION_STYLES}>{DESCRIPTION}</p>

      {plan.items.length === 0 ? (
        <p className={EMPTY_STYLES}>{EMPTY_MESSAGE}</p>
      ) : (
        <div className={LIST_STYLES}>
          {plan.items.map((item, index) => {
            const badge = getPriorityBadge(item.priority);

            return (
              <div key={item.topic_id ?? `mixed-practice-${index}`} className={ROW_STYLES}>
                <div className={ROW_MAIN_STYLES}>
                  <p className={NAME_STYLES}>{item.topic_name}</p>
                  <p className={REASON_STYLES}>{item.reason}</p>
                  <p className={CAPTION_STYLES}>
                    {buildQuestionCountCaption(item.recommended_questions)}
                  </p>
                </div>

                <span
                  className={`${BADGE_STYLES} ${badge.textClass} ${badge.bgClass} ${badge.borderClass}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
