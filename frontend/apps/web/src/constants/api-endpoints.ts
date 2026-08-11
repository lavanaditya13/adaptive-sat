/* GET returns the session user; PATCH updates that same record and responds
   with the identical shape, so both share one path constant. */
const AUTH_ME = '/api/v1/auth/me';

export const API = {
  AUTH: {
    SIGNUP: '/api/v1/auth/signup',
    LOGIN: '/api/v1/auth/login',
    ME: AUTH_ME,
    UPDATE_PROFILE: AUTH_ME,
    LOGOUT: '/api/v1/auth/logout',
    GOOGLE_START: '/api/v1/auth/google',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    RESEND_VERIFICATION_BY_EMAIL: '/api/v1/auth/resend-verification-by-email',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
  },
  DASHBOARD: '/api/v1/dashboard',
  PRACTICE: {
    SELECT_SECTION: '/api/v1/practice/context/section',
    START: '/api/v1/practice/start',
    ABANDON: '/api/v1/practice/abandon',
    ANSWER: '/api/v1/practice/answer',
    QUESTION: '/api/v1/practice/question',
    NEXT: '/api/v1/practice/next',
    COMPLETE: '/api/v1/practice/complete',
    /* Domain -> skill accuracy tree backing the practice drill-down.
       Takes ?section=math|reading_writing; omitted falls back to the
       student's last SELECT_SECTION choice. Responds in camelCase. */
    SKILL_TREE: '/api/v1/practice/skill-tree',
  },
  SETTINGS: {
    CONNECTED_PROVIDERS: '/api/v1/settings/connected-providers',
    LINK_PROVIDER: (provider: 'google') =>
      `/api/v1/settings/connected-providers/${provider}/start`,
    UNLINK_PROVIDER: (provider: 'google') =>
      `/api/v1/settings/connected-providers/${provider}`,
  },
} as const;
