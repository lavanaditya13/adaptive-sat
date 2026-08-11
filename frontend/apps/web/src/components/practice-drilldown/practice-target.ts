import { practicePath } from '@/constants/routes';

/** What a session is scoped to. Mirrors the design's confirm-screen scopes. */
export type PracticeScope = 'general' | 'domain' | 'skill';

export const SCOPE_PARAM = 'scope';
export const DOMAIN_PARAM = 'domain';
export const SKILL_PARAM = 'skill';

export interface PracticeTarget {
  scope: PracticeScope;
  /** Present for `domain` and `skill`. */
  domainName?: string;
  /** Present for `skill` only. */
  skillName?: string;
}

const SCOPES: PracticeScope[] = ['general', 'domain', 'skill'];

/**
 * The confirm route (`/practice/:subject/confirm`) carries no target in its
 * path, so the selection travels as query params. Params (not router state)
 * keep a reloaded or bookmarked confirm screen resolvable.
 */
export function buildConfirmPath(subject: string, target: PracticeTarget): string {
  const search = new URLSearchParams({ [SCOPE_PARAM]: target.scope });

  if (target.domainName) {
    search.set(DOMAIN_PARAM, target.domainName);
  }

  if (target.skillName) {
    search.set(SKILL_PARAM, target.skillName);
  }

  return `${practicePath.confirm(subject)}?${search.toString()}`;
}

/**
 * Second entry path into the confirm screen: the practice-entry screens hand
 * their selection over as react-router location state instead of query params.
 * This shape is owned by that segment — do not redefine it here.
 */
export interface PracticeConfirmNavState {
  mode: 'section' | 'adaptive' | 'topic';
  sectionId: number;
  subject: string;
  title: string;
  questionCount: number;
}

/**
 * Drill-down extension of the contract above. `topic` mode needs the 1-based
 * `topicId` that `/practice/start` accepts, and the domain/skill names let the
 * confirm screen show real accuracy for the node instead of a section roll-up.
 */
export interface PracticeDrilldownNavState extends PracticeConfirmNavState {
  topicId?: number;
  domainName?: string;
  skillName?: string;
}

const NAV_MODES: PracticeConfirmNavState['mode'][] = ['section', 'adaptive', 'topic'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Returns null for absent or malformed state so the query params can take over. */
export function parseConfirmNavState(state: unknown): PracticeDrilldownNavState | null {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const candidate = state as Partial<PracticeDrilldownNavState>;

  if (!NAV_MODES.some((mode) => mode === candidate.mode) || !isNonEmptyString(candidate.title)) {
    return null;
  }

  return {
    mode: candidate.mode as PracticeConfirmNavState['mode'],
    sectionId: typeof candidate.sectionId === 'number' ? candidate.sectionId : 0,
    subject: isNonEmptyString(candidate.subject) ? candidate.subject : '',
    title: candidate.title,
    questionCount:
      typeof candidate.questionCount === 'number' && candidate.questionCount > 0
        ? candidate.questionCount
        : 0,
    topicId: typeof candidate.topicId === 'number' ? candidate.topicId : undefined,
    domainName: isNonEmptyString(candidate.domainName) ? candidate.domainName : undefined,
    skillName: isNonEmptyString(candidate.skillName) ? candidate.skillName : undefined,
  };
}

/** Tolerant of junk/absent params: anything unrecognised reads as `general`. */
export function parsePracticeTarget(search: URLSearchParams): PracticeTarget {
  const rawScope = search.get(SCOPE_PARAM);
  const domainName = search.get(DOMAIN_PARAM) ?? undefined;
  const skillName = search.get(SKILL_PARAM) ?? undefined;
  const scope = SCOPES.find((candidate) => candidate === rawScope);

  if (scope === 'skill' && domainName && skillName) {
    return { scope, domainName, skillName };
  }

  if (scope === 'domain' && domainName) {
    return { scope, domainName };
  }

  return { scope: 'general' };
}
