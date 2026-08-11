export const TITLE = 'Practice by Topic';
export const DESCRIPTION = 'Focus on specific topic areas. Drill down to individual skills.';

export function buildBrowseLabel(domainsCount: number): string {
  return `Browse ${domainsCount} Domain${domainsCount === 1 ? '' : 's'}`;
}

const MAX_VISIBLE_CHIPS = 3;

/** First few domain names as short chips, "+N more" for the rest. */
export function buildDomainChips(domainNames: string[]): string[] {
  if (domainNames.length <= MAX_VISIBLE_CHIPS) {
    return domainNames;
  }

  const visible = domainNames.slice(0, MAX_VISIBLE_CHIPS);
  return [...visible, `+${domainNames.length - MAX_VISIBLE_CHIPS} more`];
}
