import { Card } from '@workspace/ui/components/card';
import { TITLE, EMPTY_MESSAGE, MASTERY_SUFFIX } from './WeakTopicsList.constants';
import {
  CARD_STYLES,
  TITLE_STYLES,
  EMPTY_STYLES,
  LIST_CONTAINER_STYLES,
  ITEM_STYLES,
  NAME_STYLES,
  SCORE_STYLES,
} from './WeakTopicsList.styles';

// note: weak_topics has no section_id, so it can't deep-link into topic practice yet without another backend field

interface WeakTopic {
  topic_id: number;
  display_name: string;
  mastery_score: number;
}

interface WeakTopicsListProps {
  topics: WeakTopic[];
}

export function WeakTopicsList({ topics }: WeakTopicsListProps) {
  if (topics.length === 0) {
    return (
      <Card className={CARD_STYLES}>
        <h3 className={TITLE_STYLES}>{TITLE}</h3>
        <p className={EMPTY_STYLES}>{EMPTY_MESSAGE}</p>
      </Card>
    );
  }

  return (
    <Card className={CARD_STYLES}>
      <h3 className={TITLE_STYLES}>{TITLE}</h3>
      <div className={LIST_CONTAINER_STYLES}>
        {topics.map((topic) => (
          <div key={topic.topic_id} className={ITEM_STYLES}>
            <span className={NAME_STYLES}>{topic.display_name}</span>
            <span className={SCORE_STYLES}>
              {topic.mastery_score}
              {MASTERY_SUFFIX}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
