/** The design shows three chips then a roll-up; real domains carry 2–14 skills. */
export const MAX_VISIBLE_CHIPS = 3;
export const NO_SKILLS_LABEL = 'No skills tagged yet';

export function buildMoreChipLabel(hiddenCount: number): string {
  return `+${hiddenCount} more`;
}

export function splitChips(
  names: string[],
  maxVisible = MAX_VISIBLE_CHIPS
): { visible: string[]; hiddenCount: number } {
  return {
    visible: names.slice(0, maxVisible),
    hiddenCount: Math.max(0, names.length - maxVisible),
  };
}
