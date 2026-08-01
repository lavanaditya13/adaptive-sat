import { ChevronRight } from 'lucide-react';
import { ROW_STYLES, TITLE_STYLES, SUBTITLE_STYLES, CONTAINER_STYLES } from './TopicListItem.styles';

interface Topic {
  topic_id: number;
  name: string;
  display_name: string;
}

interface TopicListItemProps {
  topic: Topic;
  onPracticeNow: (topicId: number) => void;
  isLoading?: boolean;
}

export function TopicListItem({ topic, onPracticeNow, isLoading = false }: TopicListItemProps) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => onPracticeNow(topic.topic_id)}
      className={ROW_STYLES}
    >
      <div className={CONTAINER_STYLES}>
        <h4 className={TITLE_STYLES}>{topic.display_name}</h4>
        <p className={SUBTITLE_STYLES}>{topic.name}</p>
      </div>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
