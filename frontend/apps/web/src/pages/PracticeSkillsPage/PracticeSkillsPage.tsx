import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, practicePath } from '@/constants/routes';
import { useAppShellStore } from '@/store/app-shell-store';
import {
  DrillDownError,
  DrillDownRow,
  DrillDownSkeleton,
  buildConfirmPath,
  buildMasteryRuleLabel,
  getDrilldownAccent,
} from '@/components/practice-drilldown';
import { findDomain, isSectionName, useSkillTree } from '@/components/practice-drilldown/use-skill-tree';
import {
  EMPTY_SKILLS_MESSAGE,
  INDIVIDUAL_SKILLS_LABEL,
  MISSING_DOMAIN_TOAST,
  START_SKILL_LABEL,
  buildFullDomainTestLabel,
  buildSummaryLabel,
} from './PracticeSkillsPage.constants';
import {
  CONTAINER_STYLES,
  DIVIDER_STYLES,
  EMPTY_STYLES,
  FULL_TEST_BUTTON_STYLES,
  HEADER_STYLES,
  LIST_STYLES,
  MASTERY_RULE_STYLES,
  SECTION_LABEL_STYLES,
  SKILL_BUTTON_STYLES,
  SUMMARY_STYLES,
  TITLE_STYLES,
} from './PracticeSkillsPage.styles';

/** `/practice/:subject/domains/:domain` — the chosen domain's skills, each
 *  practisable on its own, plus a full-domain test. */
export function PracticeSkillsPage() {
  const navigate = useNavigate();
  const { subject, domain: encodedDomain } = useParams();
  const showToast = useAppShellStore((state) => state.showToast);

  const section = isSectionName(subject) ? subject : null;
  const domainName = encodedDomain ? decodeURIComponent(encodedDomain) : undefined;
  const { data: tree, isLoading, error, refetch } = useSkillTree(section);
  const domain = findDomain(tree, domainName);

  // A bookmarked domain that no longer exists in the curriculum: say so once,
  // then fall back to the domain list rather than rendering an empty shell.
  const isMissingDomain = Boolean(tree) && !domain;

  useEffect(() => {
    if (isMissingDomain) {
      showToast(MISSING_DOMAIN_TOAST);
    }
  }, [isMissingDomain, showToast]);

  if (!section) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  if (isMissingDomain) {
    return <Navigate to={practicePath.domains(section)} replace />;
  }

  const accent = getDrilldownAccent(section);

  return (
    <div className={CONTAINER_STYLES}>
      {isLoading && <DrillDownSkeleton />}

      {!isLoading && error && <DrillDownError error={error} onRetry={() => void refetch()} />}

      {tree && domain && (
        <>
          <div className={HEADER_STYLES}>
            <h2 className={TITLE_STYLES}>{domain.name}</h2>
            <p className={SUMMARY_STYLES}>
              {buildSummaryLabel(domain.skills.length, domain.questionsAttempted)}
            </p>
            <p className={MASTERY_RULE_STYLES}>{buildMasteryRuleLabel(tree.masteryRule)}</p>
          </div>

          <button
            type="button"
            className={`${FULL_TEST_BUTTON_STYLES} ${accent.button}`}
            onClick={() =>
              navigate(buildConfirmPath(section, { scope: 'domain', domainName: domain.name }))
            }
          >
            {buildFullDomainTestLabel(domain.name)}
          </button>

          <div className={DIVIDER_STYLES} />
          <p className={SECTION_LABEL_STYLES}>{INDIVIDUAL_SKILLS_LABEL}</p>

          {domain.skills.length === 0 ? (
            <p className={EMPTY_STYLES}>{EMPTY_SKILLS_MESSAGE}</p>
          ) : (
            <div className={LIST_STYLES}>
              {domain.skills.map((skill) => (
                <DrillDownRow
                  key={skill.name}
                  node={skill}
                  accent={accent}
                  compact
                  onSelect={() =>
                    navigate(
                      buildConfirmPath(section, {
                        scope: 'skill',
                        domainName: domain.name,
                        skillName: skill.name,
                      })
                    )
                  }
                  actions={
                    <button
                      type="button"
                      className={`${SKILL_BUTTON_STYLES} ${accent.button}`}
                      onClick={() =>
                        navigate(
                          buildConfirmPath(section, {
                            scope: 'skill',
                            domainName: domain.name,
                            skillName: skill.name,
                          })
                        )
                      }
                    >
                      {START_SKILL_LABEL}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
