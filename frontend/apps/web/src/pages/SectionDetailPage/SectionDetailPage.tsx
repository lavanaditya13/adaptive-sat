import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { PracticeOptionCard } from '@/components/practice/PracticeOptionCard/PracticeOptionCard';
import { TopicListItem } from '@/components/practice/TopicListItem/TopicListItem';
import { selectSection, startPractice, type StartPracticePayload } from '@/services/practice-service';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import type { ApiErrorResponse } from '@/types/api';
import {
  PAGE_TITLE_PREFIX,
  PRACTICE_OPTIONS_TITLE,
  TOPICS_TITLE,
  ERROR_MESSAGE,
  RETRY_BUTTON_TEXT,
  BACK_TO_DASHBOARD_TEXT,
  DEFAULT_403_ERROR,
  INVALID_SECTION_ID_ERROR,
} from './SectionDetailPage.constants';
import {
  CONTAINER_STYLES,
  PAGE_TITLE_STYLES,
  SECTION_TITLE_STYLES,
  OPTIONS_GRID_STYLES,
  TOPICS_LIST_STYLES,
  ALERT_CONTAINER_STYLES,
  SKELETON_TITLE_STYLES,
  SKELETON_GRID_STYLES,
  SKELETON_CARD_STYLES,
  SKELETON_TOPIC_STYLES,
  BACK_BUTTON_STYLES,
  RETRY_BUTTON_STYLES,
} from './SectionDetailPage.styles';

export function SectionDetailPage() {
  const { sectionId: sectionIdParam } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const sectionId = Number(sectionIdParam);

  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const {
    data: sectionContext,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.practice.sectionContext(sectionId),
    queryFn: () => selectSection(sectionId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !isNaN(sectionId) && sectionId > 0,
  });

  const handleStartPractice = async (mode: StartPracticePayload['mode'], topicId?: number) => {
    setStartError(null);
    setIsStarting(true);
    try {
      await startPractice({
        section_id: sectionId,
        mode: topicId ? 'topic' : mode,
        topic_id: topicId,
      });
      navigate(ROUTES.PRACTICE);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        if (err.response?.status === 403) {
          const detail = err.response.data?.detail || DEFAULT_403_ERROR;
          setStartError(detail);
        } else {
          setStartError(err.response?.data?.detail || ERROR_MESSAGE);
        }
      } else {
        setStartError(ERROR_MESSAGE);
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (isNaN(sectionId) || sectionId <= 0) {
    return (
      <div className={CONTAINER_STYLES}>
        <Alert variant="destructive">
          <AlertDescription>{INVALID_SECTION_ID_ERROR}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className={BACK_BUTTON_STYLES}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          {BACK_TO_DASHBOARD_TEXT}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={CONTAINER_STYLES}>
        <Skeleton className={SKELETON_TITLE_STYLES} />
        <div className={SKELETON_GRID_STYLES}>
          <Skeleton className={SKELETON_CARD_STYLES} />
          <Skeleton className={SKELETON_CARD_STYLES} />
        </div>
        <Skeleton className={SKELETON_TITLE_STYLES} />
        <div className={TOPICS_LIST_STYLES}>
          <Skeleton className={SKELETON_TOPIC_STYLES} />
          <Skeleton className={SKELETON_TOPIC_STYLES} />
          <Skeleton className={SKELETON_TOPIC_STYLES} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CONTAINER_STYLES}>
        <Alert variant="destructive">
          <AlertDescription>
            {ERROR_MESSAGE}
            <Button
              variant="outline"
              size="sm"
              className={RETRY_BUTTON_STYLES}
              onClick={() => refetch()}
            >
              {RETRY_BUTTON_TEXT}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!sectionContext) {
    return null;
  }

  return (
    <div className={CONTAINER_STYLES}>
      <Button
        variant="ghost"
        size="sm"
        className={BACK_BUTTON_STYLES}
        onClick={() => navigate(ROUTES.DASHBOARD)}
      >
        &larr; {BACK_TO_DASHBOARD_TEXT}
      </Button>

      <h1 className={PAGE_TITLE_STYLES}>{PAGE_TITLE_PREFIX}</h1>

      {startError && (
        <div className={ALERT_CONTAINER_STYLES}>
          <Alert variant="destructive">
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="space-y-4">
        <h2 className={SECTION_TITLE_STYLES}>{PRACTICE_OPTIONS_TITLE}</h2>
        <div className={OPTIONS_GRID_STYLES}>
          {sectionContext.practice_options.map((option) => (
            <PracticeOptionCard
              key={option.mode}
              option={option}
              isLoading={isStarting}
              onStart={(mode) => handleStartPractice(mode)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h2 className={SECTION_TITLE_STYLES}>{TOPICS_TITLE}</h2>
        <div className={TOPICS_LIST_STYLES}>
          {sectionContext.topics.map((topic) => (
            <TopicListItem
              key={topic.topic_id}
              topic={topic}
              isLoading={isStarting}
              onPracticeNow={(topicId) => handleStartPractice('topic', topicId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
