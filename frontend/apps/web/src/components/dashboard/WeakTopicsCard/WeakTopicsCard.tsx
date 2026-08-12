import { getAccuracyBadge, getPracticeAccent } from '@/constants/practice-visuals';
import type { WeakTopic } from '@/types/api';
import {
  buildAttemptCaption,
  buildStartAriaLabel,
  DESCRIPTION,
  EMPTY_MESSAGE,
  START_LABEL,
  STARTING_LABEL,
  TITLE,
  UNAVAILABLE_LABEL,
} from './WeakTopicsCard.constants';
import {
  BADGE_STYLES,
  CAPTION_STYLES,
  CARD_STYLES,
  DESCRIPTION_STYLES,
  EMPTY_STYLES,
  FILL_STYLES,
  HEADER_ROW_STYLES,
  LIST_STYLES,
  NAME_ROW_STYLES,
  NAME_STYLES,
  ROW_MAIN_STYLES,
  ROW_STYLES,
  SECTION_PILL_STYLES,
  START_BUTTON_STYLES,
  TITLE_STYLES,
  TRACK_STYLES,
} from './WeakTopicsCard.styles';

interface WeakTopicsCardProps {
  topics: WeakTopic[];
  /** Fires with the full topic so the page can start its practice session. */
  onPractice: (topic: WeakTopic) => void;
  /** `topic_id` of the row whose session is being started, if any. */
  startingTopicId?: number | null;
}

/** A weak topic is only practisable if the backend resolved both halves of
 *  the deep link: the section to select, and the position within it. */
function canPractice(topic: WeakTopic): boolean {
  return topic.section_id !== null && topic.practice_topic_id !== null;
}

export function WeakTopicsCard({
  topics,
  onPractice,
  startingTopicId = null,
}: WeakTopicsCardProps) {
  return (
    <section className={CARD_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <h2 className={TITLE_STYLES}>{TITLE}</h2>
      </div>
      <p className={DESCRIPTION_STYLES}>{DESCRIPTION}</p>

      {topics.length === 0 ? (
        <p className={EMPTY_STYLES}>{EMPTY_MESSAGE}</p>
      ) : (
        <div className={LIST_STYLES}>
          {topics.map((topic) => {
            const accent = getPracticeAccent(topic.section ?? 'math');
            const badge = getAccuracyBadge(topic.mastery_score, topic.questions_attempted);
            const isStarting = startingTopicId === topic.topic_id;
            const practisable = canPractice(topic);

            return (
              <div key={topic.topic_id} className={ROW_STYLES}>
                <div className={ROW_MAIN_STYLES}>
                  <div className={NAME_ROW_STYLES}>
                    <p className={NAME_STYLES}>{topic.display_name}</p>
                    {topic.section_display_name && (
                      <span
                        className={`${SECTION_PILL_STYLES} ${accent.tint} ${accent.text} ${accent.border}`}
                      >
                        {topic.section_display_name}
                      </span>
                    )}
                  </div>

                  <div className={TRACK_STYLES}>
                    <div
                      className={`${FILL_STYLES} ${accent.solid}`}
                      style={{
                        width:
                          topic.questions_attempted === 0 ? '0%' : `${topic.mastery_score}%`,
                      }}
                    />
                  </div>

                  <p className={CAPTION_STYLES}>
                    {buildAttemptCaption(topic.questions_correct, topic.questions_attempted)}
                  </p>
                </div>

                <span
                  className={`${BADGE_STYLES} ${badge.textClass} ${badge.bgClass} ${badge.borderClass}`}
                >
                  {badge.label}
                </span>

                {practisable ? (
                  <button
                    type="button"
                    className={`${START_BUTTON_STYLES} ${accent.button}`}
                    aria-label={buildStartAriaLabel(topic.display_name)}
                    disabled={startingTopicId !== null}
                    onClick={() => onPractice(topic)}
                  >
                    {isStarting ? STARTING_LABEL : START_LABEL}
                  </button>
                ) : (
                  <span className={CAPTION_STYLES}>{UNAVAILABLE_LABEL}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
