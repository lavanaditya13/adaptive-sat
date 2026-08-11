export const DEFAULT_CONFIDENCE = 3;

export const PREVIOUS_LABEL = 'Previous';
export const SKIP_LABEL = "Skip — I'll come back";
export const NEXT_LABEL = 'Next Question';
export const NEXT_REVIEW_LABEL = 'Next';
export const FINISH_LABEL = 'Finish Test';
export const TOTAL_SUFFIX = 'total';

export const REVIEW_BANNER_TEXT = 'Reviewing a past question — you can change your answer.';
export const CHANGED_PREFIX = 'Changed from your original answer (';
export const CHANGED_SUFFIX = ')';

export const LOADING_LABEL = 'Loading your session…';
export const RETRY_LABEL = 'Try again';
export const SESSION_ENDED_TITLE = 'All questions answered';
export const SESSION_ENDED_MESSAGE = 'Finish the session to see how you did.';

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function buildQuestionPill(position: number): string {
  return `Q ${position}`;
}
