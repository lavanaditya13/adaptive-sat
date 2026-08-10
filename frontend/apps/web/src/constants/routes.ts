export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CHECK_EMAIL: '/check-email',
  VERIFY_EMAIL: '/verify-email',
  OAUTH_CALLBACK: '/oauth/callback',
  LINK_ACCOUNTS: '/link-accounts',
  LOGGED_OUT: '/logged-out',

  DASHBOARD: '/dashboard',
  RESULTS: '/results',
  SETTINGS: '/settings',

  /* Practice flow. `:subject` is a SectionName ('math' | 'reading_writing');
     `:domain` is a URL-encoded domain display name. */
  PRACTICE: '/practice',
  PRACTICE_SUBJECT: '/practice/:subject',
  PRACTICE_DOMAINS: '/practice/:subject/domains',
  PRACTICE_SKILLS: '/practice/:subject/domains/:domain',
  PRACTICE_CONFIRM: '/practice/:subject/confirm',
  PRACTICE_SESSION: '/practice/session',
} as const;

/** Build a concrete practice URL from the parameterised route patterns above. */
export const practicePath = {
  subject: (subject: string) => `/practice/${subject}`,
  domains: (subject: string) => `/practice/${subject}/domains`,
  skills: (subject: string, domain: string) =>
    `/practice/${subject}/domains/${encodeURIComponent(domain)}`,
  confirm: (subject: string) => `/practice/${subject}/confirm`,
  session: () => ROUTES.PRACTICE_SESSION,
};
