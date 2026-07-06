export const ROUTES = {
    LOGIN: '/login',
    SIGNUP: '/signup',
    DASHBOARD: '/dashboard',
    PRACTICE: '/practice',
    PRACTICE_SESSION: (sessionId: string) => `/practice/${sessionId}` as const,
    RESULTS: '/results',
    SESSION_RESULTS: (sessionId: string) => `/results/${sessionId}` as const,
} as const;
