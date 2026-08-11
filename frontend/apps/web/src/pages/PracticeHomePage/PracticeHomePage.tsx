import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GeneralPracticeCard } from '@/components/practice-entry/GeneralPracticeCard/GeneralPracticeCard';
import { PracticeByTopicCard } from '@/components/practice-entry/PracticeByTopicCard/PracticeByTopicCard';
import { getSkillTree } from '@/services/skill-tree-service';
import { startPractice } from '@/services/practice-service';
import { queryKeys } from '@/constants/query-keys';
import { practicePath } from '@/constants/routes';
import { getPracticeAccent, summarizeSkillTree } from '@/constants/practice-visuals';
import { getSectionDisplayName, type SectionName } from '@/constants/section-theme';
import { useAppShellStore } from '@/store/app-shell-store';
import { getApiErrorDetail } from '@/utils/api-errors';
import { START_ERROR_MESSAGE } from './PracticeHomePage.constants';
import {
  CONTAINER_STYLES,
  GRID_STYLES,
  HEADER_ROW_STYLES,
  ICON_TILE_STYLES,
  SUBTITLE_STYLES,
  TITLE_STYLES,
} from './PracticeHomePage.styles';

export function PracticeHomePage() {
  const { subject = '' } = useParams<{ subject: SectionName }>();
  const section = subject as SectionName;
  const navigate = useNavigate();
  const showToast = useAppShellStore((state) => state.showToast);
  const [isStarting, setIsStarting] = useState(false);

  const { data } = useQuery({
    queryKey: queryKeys.practice.skillTree(section),
    queryFn: () => getSkillTree(section),
    enabled: Boolean(section),
  });

  const domains = data?.domains ?? [];
  const totals = summarizeSkillTree(domains);
  const accent = getPracticeAccent(section);
  const Icon = accent.Icon;

  const handleStartGeneral = async () => {
    setIsStarting(true);
    try {
      await startPractice({ mode: 'section' });
      navigate(practicePath.session());
    } catch (error) {
      showToast(getApiErrorDetail(error) || START_ERROR_MESSAGE);
    } finally {
      setIsStarting(false);
    }
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
            {totals.domainsCount} domains · {totals.questionsAttempted} questions done
          </p>
        </div>
      </div>

      <div className={GRID_STYLES}>
        <GeneralPracticeCard
          accent={accent}
          accuracy={totals.accuracy}
          questionsAttempted={totals.questionsAttempted}
          domainsCount={totals.domainsCount}
          isStarting={isStarting}
          onStart={handleStartGeneral}
        />
        <PracticeByTopicCard
          domainNames={domains.map((d) => d.name)}
          onClick={() => navigate(practicePath.domains(section))}
        />
      </div>
    </div>
  );
}
