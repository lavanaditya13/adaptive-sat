export const PAGE_TITLE = 'Domains';
export const PAGE_DESCRIPTION = 'Start a domain test or drill into individual skills.';
export const START_DOMAIN_LABEL = 'Start domain test';
export const VIEW_SKILLS_LABEL = 'View skills';
export const OVERALL_TITLE = 'Overall practice test';
export const OVERALL_START_LABEL = 'Start overall test';
export const START_ERROR_MESSAGE = 'Could not start practice. Please try again.';

export function buildOverallDescription(domainsCount: number): string {
  return `Mixed questions across all ${domainsCount} domain${domainsCount === 1 ? '' : 's'} in this subject.`;
}
