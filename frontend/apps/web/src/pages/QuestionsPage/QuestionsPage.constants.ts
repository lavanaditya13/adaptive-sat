export const PAGE_TITLE = 'Questions';
export const PAGE_DESCRIPTION = 'Practice session runner.';

export const REVIEW_BANNER_TEXT =
  "Reviewing a past question — your answer is locked in. You'll see the explanation in your results.";

export const PAUSED_TITLE = 'Session paused';
export const PAUSED_DESCRIPTION = 'The clock is stopped. Your progress is saved on the server.';
export const RESUME_BUTTON_LABEL = 'Resume session';
export const END_SESSION_BUTTON_LABEL = 'End session';

export const ERROR_SAVING_ANSWER = 'Failed to save answer. Please try again.';
export const ERROR_COMPLETING_SESSION = 'Failed to finish the session. Please try again.';

export const RESUME_ERROR_TITLE = "Couldn't load your session";
export const RESUME_ERROR_DESCRIPTION =
  "Your session is still saved. Check your connection and try again — you won't lose any answers.";
export const RESUME_RETRY_LABEL = 'Try again';

export const EXIT_DIALOG_TITLE = 'Leave this session?';
export const EXIT_DIALOG_DESCRIPTION =
  'Your answers so far are saved, but the rest of the session will be abandoned.';
export const EXIT_DIALOG_CONFIRM = 'Leave session';
export const EXIT_DIALOG_CANCEL = 'Keep practising';

export const NO_SESSION_TOAST = 'No practice session in progress.';
export const SESSION_ENDED_TOAST = 'Practice session ended.';

/** A confirmed 404 from the question endpoint is the only signal that means
 *  "there is no active session" — every other failure is transient. */
export const NO_ACTIVE_SESSION_STATUS = 404;
