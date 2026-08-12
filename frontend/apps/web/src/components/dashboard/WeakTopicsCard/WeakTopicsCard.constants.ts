export const TITLE = 'Focus areas';
export const DESCRIPTION = 'Your weakest topics, ranked by accuracy. Jump straight into a set.';

export const START_LABEL = 'Practice';
export const STARTING_LABEL = 'Starting…';

export const EMPTY_MESSAGE =
  'Answer a few questions and your weakest topics will show up here.';

/** A topic the backend could not tie to a practisable section. */
export const UNAVAILABLE_LABEL = 'No questions yet';

export const START_ERROR_MESSAGE = 'Could not start practice. Try again.';
export const SESSION_CONFLICT_MESSAGE =
  'You already have a practice session in progress — finish or discard it first.';

export function buildAttemptCaption(correct: number, attempted: number): string {
  return `${correct} of ${attempted} correct`;
}

export function buildStartAriaLabel(topicName: string): string {
  return `Practice ${topicName}`;
}
