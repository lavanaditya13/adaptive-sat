import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { StatCard } from '@/components/dashboard/StatCard/StatCard';
import { WeakTopicsList } from '@/components/dashboard/WeakTopicsList/WeakTopicsList';
import { SectionCard } from '@/components/dashboard/SectionCard/SectionCard';
import { getDashboard } from '@/services/dashboard-service';
import { queryKeys } from '@/constants/query-keys';
import { getApiErrorDetail } from '@/utils/api-errors';
import {
  GREETING_PREFIX,
  GREETING_EXCLAMATION,
  SECTIONS_TITLE,
  SESSIONS_LABEL,
  QUESTIONS_LABEL,
  ACCURACY_LABEL,
  PERCENT_SUFFIX,
} from './DashboardPage.constants';
import {
  CONTAINER_STYLES,
  GREETING_STYLES,
  STATS_GRID_STYLES,
  SECTIONS_GRID_STYLES,
  SECTION_TITLE_STYLES,
  SKELETON_GREETING_STYLES,
  SKELETON_STAT_STYLES,
  SKELETON_WEAK_TOPICS_STYLES,
  SKELETON_SECTION_TITLE_STYLES,
  SKELETON_SECTION_CARD_STYLES,
} from './DashboardPage.styles';

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

  if (isLoading) {
    return (
      <div className={CONTAINER_STYLES}>
        <Skeleton className={SKELETON_GREETING_STYLES} />
        <div className={STATS_GRID_STYLES}>
          <Skeleton className={SKELETON_STAT_STYLES} />
          <Skeleton className={SKELETON_STAT_STYLES} />
          <Skeleton className={SKELETON_STAT_STYLES} />
        </div>
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
      <h1 className={GREETING_STYLES}>
        {GREETING_PREFIX}
        {dashboard.student.full_name}
        {GREETING_EXCLAMATION}
      </h1>

      <div className={STATS_GRID_STYLES}>
        <StatCard
          label={SESSIONS_LABEL}
          value={dashboard.progress.sessions_completed}
        />
        <StatCard
          label={QUESTIONS_LABEL}
          value={dashboard.progress.questions_answered}
        />
        <StatCard
          label={ACCURACY_LABEL}
          value={`${dashboard.progress.accuracy_percentage}${PERCENT_SUFFIX}`}
        />
      </div>

      <WeakTopicsList topics={dashboard.weak_topics} />

      <div className="space-y-4">
        <h2 className={SECTION_TITLE_STYLES}>{SECTIONS_TITLE}</h2>
        <div className={SECTIONS_GRID_STYLES}>
          {dashboard.sections.map((section) => (
            <SectionCard key={section.section_id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
