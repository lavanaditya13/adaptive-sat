import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ChartNoAxesColumn, Check, Flame, TrendingUp } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { EmailVerificationBanner } from '@/components/dashboard/EmailVerificationBanner/EmailVerificationBanner';
import { EstimatedScoreCard } from '@/components/dashboard/EstimatedScoreCard/EstimatedScoreCard';
import { SectionCard } from '@/components/dashboard/SectionCard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard/StatCard';
import { StudyPlanCard } from '@/components/dashboard/StudyPlanCard/StudyPlanCard';
import { REGENERATE_ERROR_MESSAGE } from '@/components/dashboard/StudyPlanCard/StudyPlanCard.constants';
import { WeakTopicsCard } from '@/components/dashboard/WeakTopicsCard/WeakTopicsCard';
import {
  SESSION_CONFLICT_MESSAGE,
  START_ERROR_MESSAGE,
} from '@/components/dashboard/WeakTopicsCard/WeakTopicsCard.constants';
import { queryKeys } from '@/constants/query-keys';
import { practicePath } from '@/constants/routes';
import { getDashboard } from '@/services/dashboard-service';
import { selectSection, startPractice } from '@/services/practice-service';
import { getStudyPlan, regenerateStudyPlan } from '@/services/study-plan-service';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';
import { getApiErrorDetail } from '@/utils/api-errors';
import { getFirstName } from '@/utils/user-display';
import type { DashboardResponse, User, WeakTopic } from '@/types/api';
import {
  ACCURACY_CAPTION_NO_TREND,
  ACCURACY_CAPTION_SUFFIX,
  ACCURACY_LABEL,
  DAY_STREAK_CAPTION,
  DAY_STREAK_CAPTION_EMPTY,
  DAY_STREAK_LABEL,
  ERROR_RETRY_LABEL,
  GREETING_PREFIX,
  GREETING_SUFFIX,
  NO_ATTEMPTS_MESSAGE,
  NO_ATTEMPTS_TITLE,
  PERCENT_SUFFIX,
  QUESTIONS_CORRECT_CAPTION_PREFIX,
  QUESTIONS_CORRECT_CAPTION_SUFFIX,
  QUESTIONS_CORRECT_LABEL,
  SECTIONS_EMPTY_MESSAGE,
  SECTIONS_TITLE,
  TESTS_TAKEN_CAPTION_PREFIX,
  TESTS_TAKEN_CAPTION_SUFFIX,
  TESTS_TAKEN_LABEL,
  getTimeOfDayGreeting,
} from './DashboardPage.constants';
import {
  BANNER_WRAPPER_STYLES,
  CONTAINER_STYLES,
  EMPTY_MESSAGE_STYLES,
  EMPTY_PANEL_STYLES,
  EMPTY_TITLE_STYLES,
  ERROR_MESSAGE_STYLES,
  ERROR_PANEL_STYLES,
  GREETING_BLOCK_STYLES,
  GREETING_EYEBROW_STYLES,
  GREETING_STYLES,
  SCORE_BLOCK_STYLES,
  SECTION_LABEL_STYLES,
  SECTIONS_GRID_STYLES,
  SKELETON_GREETING_STYLES,
  SKELETON_SCORE_STYLES,
  SKELETON_SECTION_CARD_STYLES,
  SKELETON_SECTION_LABEL_STYLES,
  SKELETON_STAT_STYLES,
  SKELETON_STUDY_PLAN_STYLES,
  SKELETON_WEAK_TOPICS_STYLES,
  STATS_GRID_STYLES,
  STUDY_PLAN_BLOCK_STYLES,
  WEAK_TOPICS_BLOCK_STYLES,
} from './DashboardPage.styles';

type DashboardSection = DashboardResponse['sections'][number];

/** The dashboard payload carries the canonical name; the auth store is the
 *  fallback when the session was restored without a fresh dashboard fetch. */
function resolveFirstName(user: User | null, dashboardFullName: string): string {
  if (!dashboardFullName.trim()) {
    return getFirstName(user);
  }

  return getFirstName({ ...user, full_name: dashboardFullName } as User);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const showToast = useAppShellStore((state) => state.showToast);
  const [startingTopicId, setStartingTopicId] = useState<number | null>(null);

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: getDashboard,
  });

  const { data: studyPlan, isLoading: isStudyPlanLoading } = useQuery({
    queryKey: queryKeys.studyPlan.all,
    queryFn: getStudyPlan,
  });

  const regenerateStudyPlanMutation = useMutation({
    mutationFn: regenerateStudyPlan,
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.studyPlan.all, plan);
    },
    onError: (err) => {
      showToast(getApiErrorDetail(err) || REGENERATE_ERROR_MESSAGE);
    },
  });

  const handleSelectSection = (section: DashboardSection) => {
    navigate(practicePath.subject(section.name));
  };

  /* The one-click deep link the weak-topic card offers. It has to select the
     section first: topic mode resolves `topic_id` as a position *within the
     student's currently selected section*, so skipping this would happily
     start the same position in whichever section was selected last — a
     different topic entirely. Elsewhere PracticeHomePage does this
     registration, but the dashboard bypasses that screen. */
  const handlePracticeWeakTopic = async (topic: WeakTopic) => {
    if (topic.section_id === null || topic.practice_topic_id === null) {
      return;
    }

    setStartingTopicId(topic.topic_id);

    try {
      await selectSection(topic.section_id);
      await startPractice({ mode: 'topic', topic_id: topic.practice_topic_id });
      navigate(practicePath.session());
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        // An unfinished session blocks a new one; the practice screens own
        // the resume/discard choice, so just say so rather than duplicating it.
        showToast(SESSION_CONFLICT_MESSAGE);
        return;
      }

      showToast(getApiErrorDetail(err) || START_ERROR_MESSAGE);
    } finally {
      setStartingTopicId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={CONTAINER_STYLES}>
        <Skeleton className={SKELETON_GREETING_STYLES} />
        <div className={STATS_GRID_STYLES}>
          <Skeleton className={SKELETON_STAT_STYLES} />
          <Skeleton className={SKELETON_STAT_STYLES} />
          <Skeleton className={SKELETON_STAT_STYLES} />
          <Skeleton className={SKELETON_STAT_STYLES} />
        </div>
        <Skeleton className={SKELETON_SCORE_STYLES} />
        <Skeleton className={SKELETON_WEAK_TOPICS_STYLES} />
        <Skeleton className={SKELETON_STUDY_PLAN_STYLES} />
        <Skeleton className={SKELETON_SECTION_LABEL_STYLES} />
        <div className={SECTIONS_GRID_STYLES}>
          <Skeleton className={SKELETON_SECTION_CARD_STYLES} />
          <Skeleton className={SKELETON_SECTION_CARD_STYLES} />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={ERROR_PANEL_STYLES}>
          <p className={ERROR_MESSAGE_STYLES}>{getApiErrorDetail(error)}</p>
          <Button size="sm" onClick={() => refetch()}>
            {ERROR_RETRY_LABEL}
          </Button>
        </div>
      </div>
    );
  }

  const { progress, sections, estimated_score } = dashboard;
  const hasAttempts = progress.questions_answered > 0;
  const trend = progress.accuracy_trend_percentage;

  return (
    <div className={CONTAINER_STYLES}>
      {user?.email_verified === false && (
        <div className={BANNER_WRAPPER_STYLES}>
          <EmailVerificationBanner />
        </div>
      )}

      <div className={GREETING_BLOCK_STYLES}>
        <p className={GREETING_EYEBROW_STYLES}>{getTimeOfDayGreeting()}</p>
        <h1 className={GREETING_STYLES}>
          {GREETING_PREFIX}
          {resolveFirstName(user, dashboard.student.full_name)}
          {GREETING_SUFFIX}
        </h1>
      </div>

      <div className={STATS_GRID_STYLES}>
        <StatCard
          label={QUESTIONS_CORRECT_LABEL}
          value={progress.questions_correct}
          icon={Check}
          tone="success"
          caption={`${QUESTIONS_CORRECT_CAPTION_PREFIX}${progress.questions_answered}${QUESTIONS_CORRECT_CAPTION_SUFFIX}`}
        />
        <StatCard
          label={TESTS_TAKEN_LABEL}
          value={progress.sessions_completed}
          icon={ChartNoAxesColumn}
          tone="math"
          caption={`${TESTS_TAKEN_CAPTION_PREFIX}${progress.avg_session_minutes}${TESTS_TAKEN_CAPTION_SUFFIX}`}
        />
        <StatCard
          label={ACCURACY_LABEL}
          value={`${progress.accuracy_percentage}${PERCENT_SUFFIX}`}
          icon={TrendingUp}
          tone="reading"
          caption={
            trend === 0
              ? ACCURACY_CAPTION_NO_TREND
              : `${trend > 0 ? '+' : ''}${trend}${ACCURACY_CAPTION_SUFFIX}`
          }
        />
        <StatCard
          label={DAY_STREAK_LABEL}
          value={progress.day_streak}
          icon={Flame}
          tone="streak"
          caption={progress.day_streak > 0 ? DAY_STREAK_CAPTION : DAY_STREAK_CAPTION_EMPTY}
        />
      </div>

      <div className={SCORE_BLOCK_STYLES}>
        {hasAttempts ? (
          <EstimatedScoreCard estimatedScore={estimated_score} />
        ) : (
          <div className={EMPTY_PANEL_STYLES}>
            <p className={EMPTY_TITLE_STYLES}>{NO_ATTEMPTS_TITLE}</p>
            <p className={EMPTY_MESSAGE_STYLES}>{NO_ATTEMPTS_MESSAGE}</p>
          </div>
        )}
      </div>

      {hasAttempts && (
        <div className={WEAK_TOPICS_BLOCK_STYLES}>
          <WeakTopicsCard
            topics={dashboard.weak_topics}
            onPractice={handlePracticeWeakTopic}
            startingTopicId={startingTopicId}
          />
        </div>
      )}

      {isStudyPlanLoading ? (
        <Skeleton className={SKELETON_STUDY_PLAN_STYLES} />
      ) : (
        studyPlan && (
          <div className={STUDY_PLAN_BLOCK_STYLES}>
            <StudyPlanCard
              plan={studyPlan}
              onRegenerate={() => regenerateStudyPlanMutation.mutate()}
              isRegenerating={regenerateStudyPlanMutation.isPending}
            />
          </div>
        )
      )}

      <p className={SECTION_LABEL_STYLES}>{SECTIONS_TITLE}</p>
      {sections.length > 0 ? (
        <div className={SECTIONS_GRID_STYLES}>
          {sections.map((section) => (
            <SectionCard
              key={section.section_id}
              section={section}
              onSelect={handleSelectSection}
            />
          ))}
        </div>
      ) : (
        <div className={EMPTY_PANEL_STYLES}>
          <p className={EMPTY_MESSAGE_STYLES}>{SECTIONS_EMPTY_MESSAGE}</p>
        </div>
      )}
    </div>
  );
}
