import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { DomainBrowseCard } from '@/components/practice-entry/DomainBrowseCard/DomainBrowseCard';
import { PracticeModeCard } from '@/components/practice-entry/PracticeModeCard/PracticeModeCard';
import { getPracticeAccent } from '@/components/practice-entry/practice-accent';
import { isSectionName } from '@/components/practice-entry/practice-entry.utils';
import type { PracticeConfirmNavState } from '@/components/practice-entry/practice-entry.types';
import {
  useSectionPracticeOptions,
  useSectionSummary,
  useSkillTree,
} from '@/components/practice-entry/use-practice-entry';
import { ROUTES, practicePath } from '@/constants/routes';
import { getSectionDisplayName, type SectionName } from '@/constants/section-theme';
import { getApiErrorDetail } from '@/utils/api-errors';
import type { PracticeOption } from '@/types/api';
import {
  ERROR_TITLE,
  NO_MODES_DESCRIPTION,
  NO_MODES_TITLE,
  getSubtitle,
} from './PracticeHomePage.constants';
import {
  CONTAINER_STYLES,
  GRID_STYLES,
  HEADER_STYLES,
  ICON_TILE_STYLES,
  PANEL_STYLES,
  PANEL_TITLE_STYLES,
  SKELETON_CARD_STYLES,
  SKELETON_HEADER_STYLES,
  SUBTITLE_STYLES,
  TITLE_STYLES,
} from './PracticeHomePage.styles';

/** Validates `:subject` against the real section codes before rendering. */
export function PracticeHomePage() {
  const { subject } = useParams<{ subject: string }>();

  if (!isSectionName(subject)) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  return <PracticeHomeContent subject={subject} />;
}

interface PracticeHomeContentProps {
  subject: SectionName;
}

function PracticeHomeContent({ subject }: PracticeHomeContentProps) {
  const navigate = useNavigate();
  const accent = getPracticeAccent(subject);
  const Icon = accent.icon;

  const {
    section,
    isLoading: isSectionLoading,
    error: sectionError,
  } = useSectionSummary(subject);

  const { data: skillTree, isLoading: isSkillTreeLoading } = useSkillTree(subject);

  const {
    options,
    isLoading: isOptionsLoading,
    error: optionsError,
  } = useSectionPracticeOptions(section?.section_id);

  const domains = skillTree?.domains ?? [];
  const domainsCount = domains.length > 0 ? domains.length : (section?.topics_count ?? 0);
  const questionsDone = section?.questions_completed ?? 0;
  const accuracy = questionsDone > 0 ? (section?.accuracy_percentage ?? null) : null;

  const isLoading = isSectionLoading || isOptionsLoading || isSkillTreeLoading;
  const error = sectionError ?? optionsError;

  const handleStart = (option: PracticeOption) => {
    if (!section) {
      return;
    }

    const state: PracticeConfirmNavState = {
      mode: option.mode,
      sectionId: section.section_id,
      subject,
      title: option.title,
      questionCount: option.question_count,
    };

    navigate(practicePath.confirm(subject), { state });
  };

  if (isLoading) {
    return (
      <div className={CONTAINER_STYLES}>
        <Skeleton className={SKELETON_HEADER_STYLES} />
        <div className={GRID_STYLES}>
          <Skeleton className={SKELETON_CARD_STYLES} />
          <Skeleton className={SKELETON_CARD_STYLES} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={PANEL_STYLES}>
          <h2 className={PANEL_TITLE_STYLES}>{ERROR_TITLE}</h2>
          <p className="m-0">{getApiErrorDetail(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <div className={`${ICON_TILE_STYLES} ${accent.iconTile}`}>
          <Icon className={`size-5 ${accent.text}`} aria-hidden="true" />
        </div>
        <div>
          <h1 className={TITLE_STYLES}>
            {section?.display_name ?? getSectionDisplayName(subject)}
          </h1>
          <p className={SUBTITLE_STYLES}>{getSubtitle(domainsCount, questionsDone)}</p>
        </div>
      </div>

      <div className={GRID_STYLES}>
        {options.length === 0 ? (
          <div className={PANEL_STYLES}>
            <h2 className={PANEL_TITLE_STYLES}>{NO_MODES_TITLE}</h2>
            <p className="m-0">{NO_MODES_DESCRIPTION}</p>
          </div>
        ) : (
          options.map((option) => (
            <PracticeModeCard
              key={option.mode}
              option={option}
              accent={accent}
              accuracy={accuracy}
              domainsCount={domainsCount}
              onStart={handleStart}
            />
          ))
        )}

        <DomainBrowseCard
          domains={domains}
          fallbackCount={section?.topics_count ?? 0}
          onBrowse={() => navigate(practicePath.domains(subject))}
        />
      </div>
    </div>
  );
}
