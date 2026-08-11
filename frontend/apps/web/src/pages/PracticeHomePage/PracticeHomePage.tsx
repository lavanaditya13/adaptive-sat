import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import { GeneralPracticeCard } from '@/components/practice-entry/GeneralPracticeCard/GeneralPracticeCard';
import { PracticeByTopicCard } from '@/components/practice-entry/PracticeByTopicCard/PracticeByTopicCard';
import { getSkillTree } from '@/services/skill-tree-service';
import { abandonPractice, selectSection, startPractice } from '@/services/practice-service';
import { queryKeys } from '@/constants/query-keys';
import { practicePath, ROUTES } from '@/constants/routes';
import { getPracticeAccent, summarizeSkillTree } from '@/constants/practice-visuals';
import {
  getSectionDisplayName,
  getSectionId,
  isSectionName,
  type SectionName,
} from '@/constants/section-theme';
import { useAppShellStore } from '@/store/app-shell-store';
import { getApiErrorDetail } from '@/utils/api-errors';
import type { ApiErrorResponse } from '@/types/api';
import {
  ABANDON_ERROR_MESSAGE,
  buildSubtitle,
  DEFAULT_403_ERROR,
  RESUME_SESSION_LABEL,
  SESSION_CONFLICT_DESCRIPTION,
  SESSION_CONFLICT_TITLE,
  START_ERROR_MESSAGE,
  START_OVER_LABEL,
} from './PracticeHomePage.constants';
import {
  CONFLICT_ACTIONS_STYLES,
  CONTAINER_STYLES,
  GRID_STYLES,
  HEADER_ROW_STYLES,
  ICON_TILE_STYLES,
  SUBTITLE_STYLES,
  TITLE_STYLES,
} from './PracticeHomePage.styles';

export function PracticeHomePage() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const showToast = useAppShellStore((state) => state.showToast);
  const [isStarting, setIsStarting] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  const section = subject as SectionName;
  const sectionId = getSectionId(subject);

  /* Registering the section is what makes a later /practice/start work at all:
     the backend resolves the session's section from the student's stored
     PracticeContext, not from the start payload. The dashboard now links
     straight here, so this page is the first point in the flow that knows
     which section the student picked. */
  useQuery({
    queryKey: queryKeys.practice.sectionContext(sectionId ?? 0),
    queryFn: () => selectSection(sectionId as number),
    enabled: sectionId !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: skillTree } = useQuery({
    queryKey: queryKeys.practice.skillTree(section),
    queryFn: () => getSkillTree(section),
    enabled: isSectionName(subject),
  });

  // A bookmarked or hand-typed section that isn't real should land on the picker
  // rather than render an empty shell against a section id we can't resolve.
  if (!isSectionName(subject)) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  const domains = skillTree?.domains ?? [];
  const totals = summarizeSkillTree(domains);
  const accent = getPracticeAccent(section);
  const Icon = accent.Icon;

  const runStart = async () => {
    setIsStarting(true);
    try {
      await startPractice({ section_id: sectionId ?? undefined, mode: 'section' });
      navigate(practicePath.session());
    } catch (error) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        if (error.response?.status === 409) {
          // A session is already open. Dead-ending here would strand the student,
          // so offer the same resume / discard choice the old modal did.
          setHasConflict(true);
          return;
        }

        if (error.response?.status === 403) {
          showToast(error.response.data?.detail || DEFAULT_403_ERROR);
          return;
        }
      }

      showToast(getApiErrorDetail(error) || START_ERROR_MESSAGE);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartOver = async () => {
    setIsStarting(true);
    try {
      await abandonPractice();
    } catch {
      setIsStarting(false);
      setHasConflict(false);
      showToast(ABANDON_ERROR_MESSAGE);
      return;
    }

    setHasConflict(false);
    setIsStarting(false);
    await runStart();
  };

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <div className={`${ICON_TILE_STYLES} ${accent.tint}`}>
          <Icon className={`size-[18px] ${accent.text}`} aria-hidden="true" />
        </div>
        <div>
          <h1 className={TITLE_STYLES}>{getSectionDisplayName(section)}</h1>
          <p className={SUBTITLE_STYLES}>
            {buildSubtitle(totals.domainsCount, totals.questionsAttempted)}
          </p>
        </div>
      </div>

      {hasConflict && (
        <Alert variant="destructive">
          <AlertTitle>{SESSION_CONFLICT_TITLE}</AlertTitle>
          <AlertDescription>
            {SESSION_CONFLICT_DESCRIPTION}
            <div className={CONFLICT_ACTIONS_STYLES}>
              <Button
                size="sm"
                onClick={() => navigate(practicePath.session())}
                disabled={isStarting}
              >
                {RESUME_SESSION_LABEL}
              </Button>
              <Button size="sm" variant="outline" onClick={handleStartOver} disabled={isStarting}>
                {START_OVER_LABEL}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className={GRID_STYLES}>
        <GeneralPracticeCard
          accent={accent}
          accuracy={totals.accuracy}
          questionsAttempted={totals.questionsAttempted}
          domainsCount={totals.domainsCount}
          isStarting={isStarting}
          onStart={runStart}
        />
        <PracticeByTopicCard
          domainNames={domains.map((d) => d.name)}
          onClick={() => navigate(practicePath.domains(section))}
        />
      </div>
    </div>
  );
}
