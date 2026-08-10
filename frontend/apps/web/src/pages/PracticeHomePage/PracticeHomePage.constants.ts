export const PAGE_TITLE = 'Practice home';
export const PAGE_DESCRIPTION = 'General practice or drill into a domain.';

export const ERROR_TITLE = 'Could not load this section';
export const NO_MODES_TITLE = 'No practice modes available';
export const NO_MODES_DESCRIPTION =
  'This section has no practice modes right now. Try another section, or check back once questions have been loaded.';

export function getSubtitle(domainsCount: number, questionsDone: number): string {
  const domainWord = domainsCount === 1 ? 'domain' : 'domains';
  const questionWord = questionsDone === 1 ? 'question' : 'questions';

  return `${domainsCount} ${domainWord} · ${questionsDone} ${questionWord} done`;
}
