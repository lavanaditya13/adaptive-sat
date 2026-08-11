import { useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { ROUTES, practicePath } from '@/constants/routes';
import { useAppShellStore } from '@/store/app-shell-store';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import { startPractice, type StartPracticePayload } from '@/services/practice-service';
import type { SkillTreeResponse } from '@/services/skill-tree-service';
import { getApiErrorDetail } from '@/utils/api-errors';
import {
  ACCURACY_TEXT_STYLES,
  DrillDownError,
  DrillDownSkeleton,
  getAccuracyTone,
  getDrilldownAccent,
  parseConfirmNavState,
  parsePracticeTarget,
  type PracticeDrilldownNavState,
  type PracticeScope,
  type PracticeTarget,
} from '@/components/practice-drilldown';
import {
  findDomain,
  getOverallAccuracy,
  isSectionName,
  useSkillTree,
} from '@/components/practice-drilldown/use-skill-tree';
import {
  ACCURACY_LABEL,
  BACK_LABEL,
  DEFAULT_QUESTION_COUNT,
  FULL_DOMAIN_SUFFIX,
  GENERAL_PRACTICE_SUFFIX,
  GENERAL_PRACTICE_TITLE,
  MINUTES_LABEL,
  MINUTES_PER_QUESTION,
  NOT_ATTEMPTED_LABEL,
  NOT_ATTEMPTED_VALUE,
  QUESTIONS_LABEL,
  SCOPE_ICONS,
  START_LABEL,
  STARTING_LABEL,
  SUBTITLE_SEPARATOR,
  buildAccuracyLine,
} from './PracticeConfirmPage.constants';
import {
  ACCURACY_LINE_STYLES,
  ACTIONS_STYLES,
  BACK_BUTTON_STYLES,
  CONTAINER_STYLES,
  ICON_STYLES,
  ICON_TILE_STYLES,
  START_BUTTON_STYLES,
  START_ICON_STYLES,
  STAT_CELL_STYLES,
  STAT_DIVIDER_STYLES,
  STAT_LABEL_STYLES,
  STAT_VALUE_STYLES,
  STATS_STYLES,
  SUBTITLE_STYLES,
  TITLE_STYLES,
} from './PracticeConfirmPage.styles';

interface ResolvedTarget {
  title: string;
  subtitle: string;
  accuracy: number;
  questionsAttempted: number;
  questionCount: number;
  /** Drives which glyph the header tile shows: zap / layers / book. */
  scope: PracticeScope;
  payload: StartPracticePayload;
}

/** Accuracy for whichever node the target names, falling back to the section. */
function statsFor(
  tree: SkillTreeResponse,
  domainName?: string,
  skillName?: string
): { accuracy: number; questionsAttempted: number } | null {
  const domain = findDomain(tree, domainName);

  if (domainName && !domain) {
    return null;
  }

  if (!domain) {
    const overall = getOverallAccuracy(tree);
    return { accuracy: overall.accuracy, questionsAttempted: overall.questionsAttempted };
  }

  if (!skillName) {
    return { accuracy: domain.accuracy, questionsAttempted: domain.questionsAttempted };
  }

  const skill = domain.skills.find((candidate) => candidate.name === skillName);

  return skill
    ? { accuracy: skill.accuracy, questionsAttempted: skill.questionsAttempted }
    : null;
}

/**
 * Entry path A — the drill-down screens, which encode their selection in the
 * query string so a reloaded or bookmarked confirm screen still resolves.
 * Returns null when the named node has left the tree (stale link).
 */
function resolveFromQuery(tree: SkillTreeResponse, target: PracticeTarget): ResolvedTarget | null {
  const stats = statsFor(tree, target.domainName, target.skillName);

  if (!stats) {
    return null;
  }

  if (target.scope === 'general') {
    return {
      title: GENERAL_PRACTICE_TITLE,
      subtitle: `${tree.sectionDisplayName}${SUBTITLE_SEPARATOR}${GENERAL_PRACTICE_SUFFIX}`,
      ...stats,
      questionCount: DEFAULT_QUESTION_COUNT,
      scope: 'general',
      payload: { mode: 'section' },
    };
  }

  const domain = findDomain(tree, target.domainName);

  if (!domain) {
    return null;
  }

  // Sessions are topic-scoped on the backend, so a skill drill runs its parent
  // domain — the narrower framing is a UI affordance, not a separate mode.
  const payload: StartPracticePayload = { mode: 'topic', topic_id: domain.topicId };

  if (target.scope === 'domain') {
    return {
      title: domain.name,
      subtitle: `${tree.sectionDisplayName}${SUBTITLE_SEPARATOR}${FULL_DOMAIN_SUFFIX}`,
      ...stats,
      questionCount: DEFAULT_QUESTION_COUNT,
      scope: 'domain',
      payload,
    };
  }

  return {
    title: target.skillName as string,
    subtitle: `${tree.sectionDisplayName}${SUBTITLE_SEPARATOR}${domain.name}`,
    ...stats,
    questionCount: DEFAULT_QUESTION_COUNT,
    scope: 'skill',
    payload,
  };
}

/**
 * Entry path B — the practice-entry screens, which hand their selection over
 * as router location state (`PracticeConfirmNavState`).
 */
function resolveFromNavState(
  tree: SkillTreeResponse,
  navState: PracticeDrilldownNavState
): ResolvedTarget | null {
  const stats = statsFor(tree, navState.domainName, navState.skillName);

  if (!stats) {
    return null;
  }

  const scope: PracticeScope =
    navState.skillName ? 'skill' : navState.mode === 'topic' ? 'domain' : 'general';
  const subtitleTail = navState.domainName ?? GENERAL_PRACTICE_SUFFIX;

  return {
    title: navState.title,
    subtitle: `${tree.sectionDisplayName}${SUBTITLE_SEPARATOR}${subtitleTail}`,
    ...stats,
    questionCount: navState.questionCount || DEFAULT_QUESTION_COUNT,
    scope,
    payload:
      navState.mode === 'topic' && navState.topicId !== undefined
        ? { mode: 'topic', topic_id: navState.topicId }
        : { mode: navState.mode === 'topic' ? 'section' : navState.mode },
  };
}

/** `/practice/:subject/confirm` — last stop before a session starts. */
export function PracticeConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subject } = useParams();
  const [searchParams] = useSearchParams();
  const showToast = useAppShellStore((state) => state.showToast);
  const setTrailingCrumbLabel = useAppShellStore((state) => state.setTrailingCrumbLabel);
  const setSessionData = usePracticeSessionStore((state) => state.setSessionData);
  const resetSession = usePracticeSessionStore((state) => state.resetSession);

  const section = isSectionName(subject) ? subject : null;
  const navState = useMemo(() => parseConfirmNavState(location.state), [location.state]);
  const target = useMemo(() => parsePracticeTarget(searchParams), [searchParams]);
  const { data: tree, isLoading, error, refetch } = useSkillTree(section);

  const resolved = useMemo(() => {
    if (!tree) {
      return null;
    }

    return navState ? resolveFromNavState(tree, navState) : resolveFromQuery(tree, target);
  }, [tree, navState, target]);

  const trailingLabel = resolved?.title ?? null;

  const startMutation = useMutation({
    mutationFn: (payload: StartPracticePayload) => startPractice(payload),
    onSuccess: (response) => {
      resetSession();

      if (response.question) {
        setSessionData(response.question, response.current_position, response.total_questions);
      }

      navigate(practicePath.session());
    },
    onError: (mutationError) => showToast(getApiErrorDetail(mutationError)),
  });

  // The breadcrumb cannot derive this label — the target lives in the query
  // string or router state, not the path — so the page owns it while mounted.
  useEffect(() => {
    if (!trailingLabel) {
      return;
    }

    setTrailingCrumbLabel(trailingLabel);

    return () => setTrailingCrumbLabel(null);
  }, [trailingLabel, setTrailingCrumbLabel]);

  if (!section) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  // Named a domain or skill that is not in this section's tree any more.
  if (tree && !resolved) {
    return <Navigate to={practicePath.domains(section)} replace />;
  }

  const accent = getDrilldownAccent(section);
  const ScopeIcon = SCOPE_ICONS[resolved?.scope ?? target.scope];
  const backPath =
    target.scope === 'skill' && target.domainName
      ? practicePath.skills(section, target.domainName)
      : target.scope === 'domain'
        ? practicePath.domains(section)
        : practicePath.subject(section);

  return (
    <div className={CONTAINER_STYLES}>
      {isLoading && <DrillDownSkeleton rowCount={1} />}

      {!isLoading && error && <DrillDownError error={error} onRetry={() => void refetch()} />}

      {resolved && (
        <>
          <div className={`${ICON_TILE_STYLES} ${accent.tint}`}>
            <ScopeIcon className={`${ICON_STYLES} ${accent.text}`} aria-hidden="true" />
          </div>

          <h1 className={TITLE_STYLES}>{resolved.title}</h1>
          <p className={SUBTITLE_STYLES}>{resolved.subtitle}</p>

          <div className={STATS_STYLES}>
            <div className={`${STAT_CELL_STYLES} ${STAT_DIVIDER_STYLES}`}>
              <p className={STAT_VALUE_STYLES}>{resolved.questionCount}</p>
              <p className={STAT_LABEL_STYLES}>{QUESTIONS_LABEL}</p>
            </div>
            <div className={`${STAT_CELL_STYLES} ${STAT_DIVIDER_STYLES}`}>
              <p className={STAT_VALUE_STYLES}>
                ~{resolved.questionCount * MINUTES_PER_QUESTION}
              </p>
              <p className={STAT_LABEL_STYLES}>{MINUTES_LABEL}</p>
            </div>
            <div className={STAT_CELL_STYLES}>
              {resolved.questionsAttempted > 0 ? (
                <>
                  <p
                    className={`${STAT_VALUE_STYLES} ${
                      ACCURACY_TEXT_STYLES[
                        getAccuracyTone(resolved.accuracy, resolved.questionsAttempted)
                      ]
                    }`}
                  >
                    {resolved.accuracy}%
                  </p>
                  <p className={STAT_LABEL_STYLES}>{ACCURACY_LABEL}</p>
                </>
              ) : (
                <>
                  <p className={`${STAT_VALUE_STYLES} text-ink-muted`}>{NOT_ATTEMPTED_VALUE}</p>
                  <p className={STAT_LABEL_STYLES}>{NOT_ATTEMPTED_LABEL}</p>
                </>
              )}
            </div>
          </div>

          {resolved.questionsAttempted > 0 && (
            <p className={ACCURACY_LINE_STYLES}>{buildAccuracyLine(resolved.accuracy)}</p>
          )}

          <div className={ACTIONS_STYLES}>
            <button
              type="button"
              className={`${START_BUTTON_STYLES} ${accent.button}`}
              onClick={() => startMutation.mutate(resolved.payload)}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? STARTING_LABEL : START_LABEL}
              {!startMutation.isPending && (
                <ArrowRight className={START_ICON_STYLES} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={BACK_BUTTON_STYLES}
              onClick={() => navigate(backPath)}
            >
              {BACK_LABEL}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
