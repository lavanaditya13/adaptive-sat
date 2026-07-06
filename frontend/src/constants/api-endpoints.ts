export const API_ENDPOINTS = {
    AUTH: {
        SIGNUP: '/auth/signup',
        LOGIN: '/auth/login',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
    },
    STUDENT: {
        DASHBOARD: '/student/dashboard',
        SESSIONS: '/student/sessions',
        ANSWERS: (sessionId: string) => `/student/sessions/${sessionId}/answers`,
        COMPLETE: (sessionId: string) => `/student/sessions/${sessionId}/complete`,
        RESULTS: (sessionId: string) => `/student/sessions/${sessionId}/results`,
        WEAKNESS_ANALYSIS: '/student/weakness-analysis',
        PROGRESS: '/student/progress',
    },
    PARENT: {
        STUDENT_SUMMARY: (studentId: string) => `/parent/students/${studentId}/summary`,
    },
    TUTOR: {
        STUDENT_OVERVIEW: (studentId: string) => `/tutor/students/${studentId}/overview`,
    },
} as const;
