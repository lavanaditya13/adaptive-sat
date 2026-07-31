import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, TrendingUp, Flame } from 'lucide-react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { StatCard } from '@/components/dashboard/StatCard/StatCard';
import { WeakTopicsList } from '@/components/dashboard/WeakTopicsList/WeakTopicsList';
import { SectionCard } from '@/components/dashboard/SectionCard/SectionCard';
import { EstimatedScoreCard } from '@/components/dashboard/EstimatedScoreCard/EstimatedScoreCard';
import { PracticeModal } from '@/components/dashboard/PracticeModal/PracticeModal';
import { getDashboard } from '@/services/dashboard-service';
import { queryKeys } from '@/constants/query-keys';
import { getApiErrorDetail } from '@/utils/api-errors';
import type { DashboardResponse } from '@/types/api';
import {
  GREETING_EYEBROW,
  GREETING_PREFIX,
  GREETING_EXCLAMATION,
  SECTIONS_TITLE,
  QUESTIONS_CORRECT_LABEL,
  QUESTIONS_CORRECT_SUBTEXT_PREFIX,
  QUESTIONS_CORRECT_SUBTEXT_SUFFIX,
  TESTS_TAKEN_LABEL,
  TESTS_TAKEN_SUBTEXT_PREFIX,
  TESTS_TAKEN_SUBTEXT_SUFFIX,
  ACCURACY_LABEL,
  ACCURACY_TREND_SUFFIX,
  DAY_STREAK_LABEL,
  DAY_STREAK_SUBTEXT,
  PERCENT_SUFFIX,
} from './DashboardPage.constants';
import {
  CONTAINER_STYLES,
  GREETING_EYEBROW_STYLES,
  GREETING_STYLES,
  STATS_GRID_STYLES,
  SECTIONS_GRID_STYLES,
  SECTION_TITLE_STYLES,
  SKELETON_GREETING_STYLES,
  SKELETON_STAT_STYLES,
  SKELETON_SCORE_STYLES,
  SKELETON_WEAK_TOPICS_STYLES,
  SKELETON_SECTION_TITLE_STYLES,
  SKELETON_SECTION_CARD_STYLES,
} from './DashboardPage.styles';

type DashboardSection = DashboardResponse['sections'][number];

// note: weak_topics has no section_id, so it can't deep-link into topic practice yet without another backend field

export function DashboardPage() {
  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: getDashboard,
  });

  const [activeSection, setActiveSection] = useState<DashboardSection | null>(null);
  const [modalKey, setModalKey] = useState(0);

  const handleOpenSection = (section: DashboardSection) => {
    setActiveSection(section);
    setModalKey((key) => key + 1);
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
        <Skeleton className={SKELETON_SECTION_TITLE_STYLES} />
        <div className={SECTIONS_GRID_STYLES}>
          <Skeleton className={SKELETON_SECTION_CARD_STYLES} />
          <Skeleton className={SKELETON_SECTION_CARD_STYLES} />
        </div>
      </div>
    );
  }

  if (error) {
    const message = getApiErrorDetail(error);

    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-xl text-balance text-lg font-medium text-foreground">{message}</p>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className={CONTAINER_STYLES}>
      <div>
        <p className={GREETING_EYEBROW_STYLES}>{GREETING_EYEBROW}</p>
        <h1 className={GREETING_STYLES}>
          {GREETING_PREFIX}
          {dashboard.student.full_name}
          {GREETING_EXCLAMATION}
        </h1>
      </div>

      <div className={STATS_GRID_STYLES}>
        <StatCard
          label={QUESTIONS_CORRECT_LABEL}
          value={dashboard.progress.questions_correct}
          icon={CheckCircle2}
          subtext={`${QUESTIONS_CORRECT_SUBTEXT_PREFIX}${dashboard.progress.questions_answered}${QUESTIONS_CORRECT_SUBTEXT_SUFFIX}`}
        />
        <StatCard
          label={TESTS_TAKEN_LABEL}
          value={dashboard.progress.sessions_completed}
          icon={ClipboardList}
          subtext={`${TESTS_TAKEN_SUBTEXT_PREFIX}${dashboard.progress.avg_session_minutes}${TESTS_TAKEN_SUBTEXT_SUFFIX}`}
        />
        <StatCard
          label={ACCURACY_LABEL}
          value={`${dashboard.progress.accuracy_percentage}${PERCENT_SUFFIX}`}
          icon={TrendingUp}
          subtext={`${dashboard.progress.accuracy_trend_percentage >= 0 ? '+' : ''}${dashboard.progress.accuracy_trend_percentage}${ACCURACY_TREND_SUFFIX}`}
        />
        <StatCard
          label={DAY_STREAK_LABEL}
          value={dashboard.progress.day_streak}
          icon={Flame}
          subtext={DAY_STREAK_SUBTEXT}
        />
      </div>

      <EstimatedScoreCard estimatedScore={dashboard.estimated_score} />

      <WeakTopicsList topics={dashboard.weak_topics} />

      <div className="space-y-4">
        <h2 className={SECTION_TITLE_STYLES}>{SECTIONS_TITLE}</h2>
        <div className={SECTIONS_GRID_STYLES}>
          {dashboard.sections.map((section) => (
            <SectionCard key={section.section_id} section={section} onOpen={handleOpenSection} />
          ))}
        </div>
      </div>

      <PracticeModal
        key={modalKey}
        section={activeSection}
        open={activeSection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSection(null);
          }
        }}
      />
    </div>
  );
}
