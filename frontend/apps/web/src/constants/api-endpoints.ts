export const API = {
  AUTH: {
    SIGNUP: '/api/v1/auth/signup',
    LOGIN: '/api/v1/auth/login',
    ME: '/api/v1/auth/me',
    LOGOUT: '/api/v1/auth/logout',
    GOOGLE_START: '/api/v1/auth/google',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    RESEND_VERIFICATION_BY_EMAIL: '/api/v1/auth/resend-verification-by-email',
  },
  DASHBOARD: '/api/v1/dashboard',
  PRACTICE: {
    SELECT_SECTION: '/api/v1/practice/context/section',
    START: '/api/v1/practice/start',
    ANSWER: '/api/v1/practice/answer',
    QUESTION: '/api/v1/practice/question',
    COMPLETE: '/api/v1/practice/complete',
  },
  SETTINGS: {
    CONNECTED_PROVIDERS: '/api/v1/settings/connected-providers',
    LINK_PROVIDER: (provider: 'google') =>
      `/api/v1/settings/connected-providers/${provider}/start`,
    UNLINK_PROVIDER: (provider: 'google') =>
      `/api/v1/settings/connected-providers/${provider}`,
  },
} as const;

// 192.168.1.10:8000
