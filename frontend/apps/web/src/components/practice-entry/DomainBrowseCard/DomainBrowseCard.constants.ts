export const TITLE = 'Practice by Domain';
export const DESCRIPTION = 'Focus on specific topic areas. Drill down to individual skills.';

/** How many domain names are listed as chips before collapsing into "+N more". */
export const MAX_VISIBLE_CHIPS = 3;

export const EMPTY_CHIP_LABEL = 'Domains load as you practice';

export function getBrowseLabel(domainsCount: number): string {
  if (domainsCount <= 0) {
    return 'Browse Domains';
  }

  return `Browse ${domainsCount} ${domainsCount === 1 ? 'Domain' : 'Domains'}`;
}

export function getOverflowChipLabel(hiddenCount: number): string {
  return `+${hiddenCount} more`;
}
