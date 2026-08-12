import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SubjectCard } from '@/components/practice-entry/SubjectCard/SubjectCard';
import { getSkillTree } from '@/services/skill-tree-service';
import { queryKeys } from '@/constants/query-keys';
import { getPracticeAccent, summarizeSkillTree } from '@/constants/practice-visuals';
import { getSectionDisplayName } from '@/constants/section-theme';
import { practicePath } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  GRID_STYLES,
  HEADER_STYLES,
  TITLE_STYLES,
} from './PracticeSubjectPage.styles';
import { PAGE_DESCRIPTION, PAGE_TITLE, SECTION_DESCRIPTIONS, SECTION_ORDER } from './PracticeSubjectPage.constants';

export function PracticeSubjectPage() {
  const navigate = useNavigate();

  const results = useQueries({
    queries: SECTION_ORDER.map((section) => ({
      queryKey: queryKeys.practice.skillTree(section),
      queryFn: () => getSkillTree(section),
    })),
  });

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h1 className={TITLE_STYLES}>{PAGE_TITLE}</h1>
        <p className={DESCRIPTION_STYLES}>{PAGE_DESCRIPTION}</p>
      </div>

      <div className={GRID_STYLES}>
        {SECTION_ORDER.map((section, index) => {
          const { data, isLoading } = results[index];
          const totals = summarizeSkillTree(data?.domains ?? []);

          return (
            <SubjectCard
              key={section}
              label={getSectionDisplayName(section)}
              description={SECTION_DESCRIPTIONS[section]}
              accent={getPracticeAccent(section)}
              accuracy={totals.accuracy}
              questionsDone={totals.questionsAttempted}
              domainsCount={totals.domainsCount}
              isLoading={isLoading}
              onClick={() => navigate(practicePath.subject(section))}
            />
          );
        })}
      </div>
    </div>
  );
}
