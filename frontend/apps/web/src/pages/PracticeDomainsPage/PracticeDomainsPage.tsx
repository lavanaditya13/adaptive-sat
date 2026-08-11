import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ROUTES, practicePath } from '@/constants/routes';
import {
  DrillDownError,
  DrillDownRow,
  DrillDownSkeleton,
  SkillChipList,
  buildConfirmPath,
  buildMasteryRuleLabel,
  getDrilldownAccent,
} from '@/components/practice-drilldown';
import { isSectionName, useSkillTree } from '@/components/practice-drilldown/use-skill-tree';
import {
  EMPTY_TREE_MESSAGE,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  START_DOMAIN_TEST_LABEL,
  VIEW_SKILLS_LABEL,
} from './PracticeDomainsPage.constants';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  EMPTY_STYLES,
  GHOST_BUTTON_STYLES,
  GHOST_ICON_STYLES,
  HEADER_STYLES,
  LIST_STYLES,
  MASTERY_RULE_STYLES,
  PRIMARY_BUTTON_STYLES,
  TITLE_STYLES,
} from './PracticeDomainsPage.styles';

/** `/practice/:subject/domains` — every domain in the section, with a preview
 *  of the skills inside it. */
export function PracticeDomainsPage() {
  const navigate = useNavigate();
  const { subject } = useParams();
  const section = isSectionName(subject) ? subject : null;
  const { data: tree, isLoading, error, refetch } = useSkillTree(section);

  // Unknown subject in the URL (typo, stale link) — back to subject selection.
  if (!section) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  const accent = getDrilldownAccent(section);

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h2 className={TITLE_STYLES}>{PAGE_TITLE}</h2>
        <p className={DESCRIPTION_STYLES}>{PAGE_DESCRIPTION}</p>
        {tree && <p className={MASTERY_RULE_STYLES}>{buildMasteryRuleLabel(tree.masteryRule)}</p>}
      </div>

      {isLoading && <DrillDownSkeleton />}

      {!isLoading && error && <DrillDownError error={error} onRetry={() => void refetch()} />}

      {tree && tree.domains.length === 0 && <p className={EMPTY_STYLES}>{EMPTY_TREE_MESSAGE}</p>}

      {tree && tree.domains.length > 0 && (
        <div className={LIST_STYLES}>
          {tree.domains.map((domain) => (
            <DrillDownRow
              key={domain.topicCode}
              node={domain}
              accent={accent}
              onSelect={() => navigate(practicePath.skills(section, domain.name))}
              chips={<SkillChipList skillNames={domain.skills.map((skill) => skill.name)} />}
              actions={
                <>
                  <button
                    type="button"
                    className={`${PRIMARY_BUTTON_STYLES} ${accent.button}`}
                    onClick={() =>
                      navigate(
                        buildConfirmPath(section, { scope: 'domain', domainName: domain.name })
                      )
                    }
                  >
                    {START_DOMAIN_TEST_LABEL}
                  </button>
                  <button
                    type="button"
                    className={GHOST_BUTTON_STYLES}
                    onClick={() => navigate(practicePath.skills(section, domain.name))}
                  >
                    {VIEW_SKILLS_LABEL}
                    <ChevronRight className={GHOST_ICON_STYLES} aria-hidden="true" />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
