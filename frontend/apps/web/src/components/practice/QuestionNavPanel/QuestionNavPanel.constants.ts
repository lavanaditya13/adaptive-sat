export const PANEL_TITLE = 'Jump to a question';
export const CLOSE_LABEL = 'Close question list';
export const QUESTION_TITLE_PREFIX = 'Question';
export const ANSWERED_HINT = 'answered';
export const SKIPPED_HINT = 'skipped';
export const UNANSWERED_HINT = 'not answered yet';
export const LOCKED_HINT = 'not reached yet';
export const LEGEND_ANSWERED = 'Answered';
export const LEGEND_SKIPPED = 'Skipped';
export const LEGEND_LOCKED = 'Not reached';

/** Nav state per question, mirroring `navDots` in the design source. */
export type NavItemState = 'answered' | 'skipped' | 'unanswered' | 'locked';

export interface NavItem {
  /** 1-based session position. */
  position: number;
  state: NavItemState;
  /** The question on screen — gets the accent outline on top of `state`. */
  isCurrent: boolean;
}

export const STATE_HINTS: Record<NavItemState, string> = {
  answered: ANSWERED_HINT,
  skipped: SKIPPED_HINT,
  unanswered: UNANSWERED_HINT,
  locked: LOCKED_HINT,
};
