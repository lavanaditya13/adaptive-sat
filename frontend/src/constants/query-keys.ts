export const QUERY_KEYS = {
    STUDENT_DASHBOARD: ['student-dashboard'] as const,
    STUDENT_SESSIONS: ['student-sessions'] as const,
    STUDENT_PROGRESS: ['student-progress'] as const,
    STUDENT_WEAKNESS: ['student-weakness'] as const,
    SESSION_RESULTS: (sessionId: string) => ['session-results', sessionId] as const,
} as const;
