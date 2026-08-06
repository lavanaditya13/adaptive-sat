import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@workspace/ui/components/dialog';
import { Alert, AlertTitle, AlertDescription } from '@workspace/ui/components/alert';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Button } from '@workspace/ui/components/button';
import { PracticeOptionCard } from '@/components/practice/PracticeOptionCard/PracticeOptionCard';
import { TopicListItem } from '@/components/practice/TopicListItem/TopicListItem';
import { getSectionTheme } from '@/constants/section-theme';
import {
  selectSection,
  startPractice,
  abandonPractice,
  type StartPracticePayload,
} from '@/services/practice-service';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import type { ApiErrorResponse, PracticeOption } from '@/types/api';
import {
  SUBTITLE_CHOOSE_MODE,
  BACK_TO_OPTIONS,
  TOPIC_MODE_TITLE,
  TOPIC_MODE_DESCRIPTION,
  ERROR_MESSAGE,
  RETRY_BUTTON_TEXT,
  DEFAULT_403_ERROR,
  SESSION_CONFLICT_TITLE,
  SESSION_CONFLICT_DESCRIPTION,
  RESUME_SESSION_LABEL,
  START_OVER_LABEL,
  ABANDON_ERROR_MESSAGE,
} from './PracticeModal.constants';
import {
  CONTENT_STYLES,
  HEADER_ROW_STYLES,
  ICON_BADGE_STYLES,
  OPTIONS_LIST_STYLES,
  BACK_LINK_STYLES,
  TOPICS_LIST_STYLES,
  SKELETON_ROW_STYLES,
  SKELETON_LIST_STYLES,
  CONFLICT_ACTIONS_STYLES,
} from './PracticeModal.styles';

interface Section {
  section_id: number;
  name: string;
  display_name: string;
}

interface PracticeModalProps {
  section: Section | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = 'options' | 'topics';

export function PracticeModal({ section, open, onOpenChange }: PracticeModalProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<ModalView>('options');
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [conflictRequest, setConflictRequest] = useState<{
    mode: StartPracticePayload['mode'];
    topicId?: number;
  } | null>(null);

  const sectionId = section?.section_id ?? 0;

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
    enabled: open && sectionId > 0,
  });

  const handleStartPractice = async (mode: StartPracticePayload['mode'], topicId?: number) => {
    setStartError(null);
    setConflictRequest(null);
    setIsStarting(true);
    try {
      await startPractice({
        section_id: sectionId,
        mode: topicId ? 'topic' : mode,
        topic_id: topicId,
      });
      onOpenChange(false);
      navigate(ROUTES.PRACTICE);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        if (err.response?.status === 409) {
          // A session is already in progress for this student. Rather than
          // dead-ending here, let them resume it (it's still reachable via
          // GET /practice/question) or explicitly abandon it and retry.
          setConflictRequest({ mode: topicId ? 'topic' : mode, topicId });
        } else if (err.response?.status === 403) {
          setStartError(err.response.data?.detail || DEFAULT_403_ERROR);
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

  const handleResumeSession = () => {
    onOpenChange(false);
    navigate(ROUTES.PRACTICE);
  };

  const handleStartOver = async () => {
    if (!conflictRequest) return;

    setIsStarting(true);
    try {
      await abandonPractice();
    } catch {
      setIsStarting(false);
      setConflictRequest(null);
      setStartError(ABANDON_ERROR_MESSAGE);
      return;
    }

    await handleStartPractice(conflictRequest.mode, conflictRequest.topicId);
  };

  if (!section) {
    return null;
  }

  const theme = getSectionTheme(section.name);
  const Icon = theme.icon;
  const questionCount = sectionContext?.practice_options[0]?.question_count ?? 0;

  const topicModeOption: PracticeOption = {
    mode: 'section',
    title: TOPIC_MODE_TITLE,
    description: TOPIC_MODE_DESCRIPTION,
    is_locked: false,
    question_count: questionCount,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CONTENT_STYLES}>
        <DialogHeader>
          <div className={HEADER_ROW_STYLES}>
            <span className={`${ICON_BADGE_STYLES} ${theme.bgSoft} ${theme.text}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <DialogTitle>{section.display_name}</DialogTitle>
              <DialogDescription>
                {view === 'options' ? SUBTITLE_CHOOSE_MODE : TOPIC_MODE_DESCRIPTION}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {conflictRequest && (
          <Alert variant="destructive">
            <AlertTitle>{SESSION_CONFLICT_TITLE}</AlertTitle>
            <AlertDescription>
              {SESSION_CONFLICT_DESCRIPTION}
              <div className={CONFLICT_ACTIONS_STYLES}>
                <Button size="sm" onClick={handleResumeSession} disabled={isStarting}>
                  {RESUME_SESSION_LABEL}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartOver}
                  disabled={isStarting}
                >
                  {START_OVER_LABEL}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!conflictRequest && startError && (
          <Alert variant="destructive">
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className={SKELETON_LIST_STYLES}>
            <Skeleton className={SKELETON_ROW_STYLES} />
            <Skeleton className={SKELETON_ROW_STYLES} />
            <Skeleton className={SKELETON_ROW_STYLES} />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive">
            <AlertDescription>
              {ERROR_MESSAGE}
              <Button variant="outline" size="sm" className="ml-4" onClick={() => refetch()}>
                {RETRY_BUTTON_TEXT}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && sectionContext && view === 'options' && (
          <div className={OPTIONS_LIST_STYLES}>
            {sectionContext.practice_options.map((option) => (
              <PracticeOptionCard
                key={option.mode}
                option={option}
                isLoading={isStarting}
                onStart={(mode) => handleStartPractice(mode)}
              />
            ))}
            <PracticeOptionCard
              option={topicModeOption}
              isLoading={isStarting}
              onStart={() => setView('topics')}
            />
          </div>
        )}

        {!isLoading && !error && sectionContext && view === 'topics' && (
          <div>
            <button
              type="button"
              className={BACK_LINK_STYLES}
              onClick={() => setView('options')}
            >
              {BACK_TO_OPTIONS}
            </button>

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
        )}
      </DialogContent>
    </Dialog>
  );
}
