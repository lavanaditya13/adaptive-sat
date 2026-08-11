export const START_ERROR_MESSAGE = 'Could not start practice. Please try again.';
export const DEFAULT_403_ERROR = 'This practice mode is not available yet.';
export const ABANDON_ERROR_MESSAGE = 'Could not discard the previous session. Please try again.';

export const SESSION_CONFLICT_TITLE = 'You already have a session in progress';
export const SESSION_CONFLICT_DESCRIPTION =
  'Pick up where you left off, or discard it and start fresh.';
export const RESUME_SESSION_LABEL = 'Resume session';
export const START_OVER_LABEL = 'Start over';

export function buildSubtitle(domainsCount: number, questionsAttempted: number): string {
  const domains = `${domainsCount} ${domainsCount === 1 ? 'domain' : 'domains'}`;
  return `${domains} · ${questionsAttempted} questions done`;
}
