export const LOADING_TITLE = 'Finishing sign-in…';
export const LOADING_SUBTITLE = 'Hang tight while we confirm your account.';
export const ERROR_TITLE = 'Sign-in failed';
export const ERROR_SUBTITLE_DEFAULT = "We couldn't complete sign-in with that provider.";
export const ERROR_REASON_ACCESS_DENIED = 'You cancelled the sign-in request.';
export const ERROR_REASON_EMAIL_CONFLICT = 'That email is already used by a different account.';
export const ERROR_REASON_PROVIDER_ERROR = 'The sign-in provider returned an error.';

export const REASON_MESSAGES: Record<string, string> = {
  access_denied: ERROR_REASON_ACCESS_DENIED,
  email_conflict: ERROR_REASON_EMAIL_CONFLICT,
  provider_error: ERROR_REASON_PROVIDER_ERROR,
};

export const CONFIRM_SESSION_RETRY_COUNT = 5;
export const CONFIRM_SESSION_RETRY_DELAY_MS = 200;
