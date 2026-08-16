import { getSectionDisplayName } from '@/constants/section-theme';
import { ROUTES, practicePath } from '@/constants/routes';

export const DASHBOARD_CRUMB = 'Dashboard';
export const PRACTICE_CRUMB = 'Practice';
export const DOMAINS_CRUMB = 'Domains';
export const RESULTS_CRUMB = 'Results';
export const SETTINGS_CRUMB = 'Settings';
export const QUESTIONS_CRUMB = 'Questions';
export const CONFIRM_CRUMB = 'Start practice';
export const BREADCRUMBS_LABEL = 'Breadcrumb';

export interface Crumb {
  label: string;
  /** Ancestor crumbs navigate; the last crumb never does. */
  to?: string;
}

/**
 * Derives the crumb trail from the URL. `trailingLabel` lets the confirm and
 * session screens name their target (skill/domain/topic), which the path alone
 * does not carry.
 */
export function buildCrumbs(pathname: string, trailingLabel?: string | null): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const root: Crumb = { label: DASHBOARD_CRUMB, to: ROUTES.DASHBOARD };

  if (segments[0] === ROUTES.RESULTS.slice(1)) {
    return [root, { label: RESULTS_CRUMB }];
  }

  if (segments[0] === ROUTES.SETTINGS.slice(1)) {
    return [root, { label: SETTINGS_CRUMB }];
  }

  if (segments[0] !== ROUTES.PRACTICE.slice(1)) {
    return [{ label: DASHBOARD_CRUMB }];
  }

  const practice: Crumb = { label: PRACTICE_CRUMB, to: ROUTES.PRACTICE };

  if (segments.length === 1) {
    return [root, { label: PRACTICE_CRUMB }];
  }

  if (segments[1] === 'session') {
    return [root, practice, { label: trailingLabel || QUESTIONS_CRUMB }];
  }

  const subject = segments[1];
  const subjectCrumb: Crumb = {
    label: getSectionDisplayName(subject),
    to: practicePath.subject(subject),
  };

  if (segments.length === 2) {
    return [root, practice, { label: subjectCrumb.label }];
  }

  if (segments[2] === 'confirm') {
    return [root, practice, subjectCrumb, { label: trailingLabel || CONFIRM_CRUMB }];
  }

  if (segments[2] === 'domains') {
    if (segments.length === 3) {
      return [root, practice, subjectCrumb, { label: DOMAINS_CRUMB }];
    }

    return [
      root,
      practice,
      subjectCrumb,
      { label: DOMAINS_CRUMB, to: practicePath.domains(subject) },
      { label: decodeURIComponent(segments[3]) },
    ];
  }

  return [root, practice, subjectCrumb];
}
