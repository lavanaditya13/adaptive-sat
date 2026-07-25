import { Card } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { PRACTICE_NOW_BUTTON_TEXT, STARTING_TEXT } from './TopicListItem.constants';
import {
  CARD_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  CONTAINER_STYLES,
} from './TopicListItem.styles';

interface Topic {
  topic_id: number;
  name: string;
  display_name: string;
  action: string;
}

interface TopicListItemProps {
  topic: Topic;
  onPracticeNow: (topicId: number) => void;
  isLoading?: boolean;
}

export function TopicListItem({ topic, onPracticeNow, isLoading = false }: TopicListItemProps) {
  return (
    <Card className={CARD_STYLES}>
      <div className={CONTAINER_STYLES}>
        <h4 className={TITLE_STYLES}>{topic.display_name}</h4>
        <p className={SUBTITLE_STYLES}>{topic.name}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={() => onPracticeNow(topic.topic_id)}
      >
        {isLoading ? STARTING_TEXT : PRACTICE_NOW_BUTTON_TEXT}
      </Button>
    </Card>
  );
}
