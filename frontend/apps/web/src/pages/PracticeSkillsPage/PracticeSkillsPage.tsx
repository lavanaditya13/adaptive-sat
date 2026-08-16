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
  buildFullTestLabel,
  buildScopeNote,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  SKILLS_SECTION_LABEL,
  START_ERROR_MESSAGE,
  START_SKILL_LABEL,
} from './PracticeSkillsPage.constants';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  DIVIDER_STYLES,
  FULL_TEST_BUTTON_STYLES,
  HEADER_STYLES,
  LIST_STYLES,
  SCOPE_NOTE_STYLES,
  SECTION_LABEL_STYLES,
  TITLE_STYLES,
} from './PracticeSkillsPage.styles';

export function PracticeSkillsPage() {
  const { subject = '', domain = '' } = useParams<{ subject: SectionName; domain: string }>();
  const section = subject as SectionName;
  const domainName = decodeURIComponent(domain);
  const navigate = useNavigate();
  const showToast = useAppShellStore((state) => state.showToast);
  const [isStarting, setIsStarting] = useState(false);

  const { data } = useQuery({
    queryKey: queryKeys.practice.skillTree(section),
    queryFn: () => getSkillTree(section),
    enabled: Boolean(section),
  });

  const domainData = data?.domains.find((d) => d.name === domainName);
  const accent = getPracticeAccent(section);

  const handleStart = async () => {
    if (!domainData) return;
    setIsStarting(true);
    try {
      await startPractice({ mode: 'topic', topic_id: domainData.topicId });
      navigate(practicePath.session());
    } catch (error) {
      showToast(getApiErrorDetail(error) || START_ERROR_MESSAGE);
    } finally {
      setIsStarting(false);
    }
  };

  if (!domainData) {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={HEADER_STYLES}>
          <h2 className={TITLE_STYLES}>{NOT_FOUND_TITLE}</h2>
          <p className={DESCRIPTION_STYLES}>{NOT_FOUND_DESCRIPTION}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h2 className={TITLE_STYLES}>{domainData.name}</h2>
        <p className={DESCRIPTION_STYLES}>
          {domainData.skills.length} skills · {domainData.questionsAttempted} questions attempted
        </p>
      </div>

      <button
        type="button"
        className={`${FULL_TEST_BUTTON_STYLES} ${accent.button}`}
        disabled={isStarting}
        onClick={handleStart}
      >
        {buildFullTestLabel(domainData.name)}
      </button>

      <p className={SCOPE_NOTE_STYLES}>{buildScopeNote(domainData.name)}</p>

      <div className={DIVIDER_STYLES} />
      <p className={SECTION_LABEL_STYLES}>{SKILLS_SECTION_LABEL}</p>

      <div className={LIST_STYLES}>
        {domainData.skills.map((skill) => (
          <TopicProgressRow
            key={skill.name}
            variant="skill"
            name={skill.name}
            accuracy={skill.accuracy}
            questionsAttempted={skill.questionsAttempted}
            mastered={skill.mastered}
            accent={accent}
            startLabel={START_SKILL_LABEL}
            isStarting={isStarting}
            onStart={handleStart}
          />
        ))}
      </div>
    </div>
  );
}
