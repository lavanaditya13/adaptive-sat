export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  settings: {
    connectedProviders: ['settings', 'connected-providers'] as const,
  },
  practice: {
    sectionContext: (sectionId: number) => ['practice', 'section-context', sectionId] as const,
    currentSession: ['practice', 'current-session'] as const,
    question: (position: number) => ['practice', 'question', position] as const,
    skillTree: (section: string) => ['practice', 'skill-tree', section] as const,
    latestResult: ['practice', 'latest-result'] as const,
  },
  studyPlan: {
    all: ['study-plan'] as const,
  },
} as const;
