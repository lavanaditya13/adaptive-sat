import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopicProgressRow } from '@/components/practice-drilldown/TopicProgressRow/TopicProgressRow';
import { getSkillTree } from '@/services/skill-tree-service';
import { startPractice } from '@/services/practice-service';
import { queryKeys } from '@/constants/query-keys';
import { practicePath } from '@/constants/routes';
import { getPracticeAccent } from '@/constants/practice-visuals';
import type { SectionName } from '@/constants/section-theme';
import { useAppShellStore } from '@/store/app-shell-store';
import { getApiErrorDetail } from '@/utils/api-errors';
import {
  buildOverallDescription,
  OVERALL_START_LABEL,
  OVERALL_TITLE,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  START_DOMAIN_LABEL,
  START_ERROR_MESSAGE,
  VIEW_SKILLS_LABEL,
} from './PracticeDomainsPage.constants';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  HEADER_STYLES,
  LIST_STYLES,
  OVERALL_BUTTON_STYLES,
  OVERALL_CARD_STYLES,
  OVERALL_DESCRIPTION_STYLES,
  OVERALL_TITLE_STYLES,
  TITLE_STYLES,
} from './PracticeDomainsPage.styles';

/** 'overall' starts the whole-subject session; a number starts that domain's topic. */
type StartTarget = 'overall' | number | null;

export function PracticeDomainsPage() {
  const { subject = '' } = useParams<{ subject: SectionName }>();
  const section = subject as SectionName;
  const navigate = useNavigate();
  const showToast = useAppShellStore((state) => state.showToast);
  const [starting, setStarting] = useState<StartTarget>(null);

  const { data } = useQuery({
    queryKey: queryKeys.practice.skillTree(section),
    queryFn: () => getSkillTree(section),
    enabled: Boolean(section),
  });

  const domains = data?.domains ?? [];
  const accent = getPracticeAccent(section);

  const runStart = async (target: StartTarget, topicId?: number) => {
    setStarting(target);
    try {
      await startPractice(topicId ? { mode: 'topic', topic_id: topicId } : { mode: 'section' });
      navigate(practicePath.session());
    } catch (error) {
      showToast(getApiErrorDetail(error) || START_ERROR_MESSAGE);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h2 className={TITLE_STYLES}>{PAGE_TITLE}</h2>
        <p className={DESCRIPTION_STYLES}>{PAGE_DESCRIPTION}</p>
      </div>

      <div className={`${OVERALL_CARD_STYLES} ${accent.border}`}>
        <div>
          <p className={OVERALL_TITLE_STYLES}>{OVERALL_TITLE}</p>
          <p className={OVERALL_DESCRIPTION_STYLES}>{buildOverallDescription(domains.length)}</p>
        </div>
        <button
          type="button"
          className={`${OVERALL_BUTTON_STYLES} ${accent.button}`}
          disabled={starting !== null}
          onClick={() => runStart('overall')}
        >
          {OVERALL_START_LABEL}
        </button>
      </div>

      <div className={LIST_STYLES}>
        {domains.map((domain) => (
          <TopicProgressRow
            key={domain.topicId}
            variant="domain"
            name={domain.name}
            accuracy={domain.accuracy}
            questionsAttempted={domain.questionsAttempted}
            mastered={domain.mastered}
            accent={accent}
            startLabel={START_DOMAIN_LABEL}
            isStarting={starting !== null}
            onStart={() => runStart(domain.topicId, domain.topicId)}
            secondaryLabel={VIEW_SKILLS_LABEL}
            onSecondary={() => navigate(practicePath.skills(section, domain.name))}
          />
        ))}
      </div>
    </div>
  );
}
