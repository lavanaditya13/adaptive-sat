export const PANEL_TITLE = 'Jump to a question';
export const UNSEEN_HINT = 'Not reached yet';
export const SKIPPED_HINT = 'Skipped';
export const ANSWERED_HINT = 'Answered';
export const CURRENT_HINT = 'Current question';

export function buildDotTitle(position: number, hint: string): string {
  return `Question ${position} — ${hint}`;
}
