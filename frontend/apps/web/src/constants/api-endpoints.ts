export const API = {
  AUTH: {
    SIGNUP: '/api/v1/auth/signup',
    LOGIN: '/api/v1/auth/login',
  },
  DASHBOARD: '/api/v1/dashboard',
  PRACTICE: {
    SELECT_SECTION: '/api/v1/practice/context/section',
    START: '/api/v1/practice/start',
    ANSWER: '/api/v1/practice/answer',
    QUESTION: '/api/v1/practice/question',
    COMPLETE: '/api/v1/practice/complete',
  },
} as const;


// 192.168.1.10:8000