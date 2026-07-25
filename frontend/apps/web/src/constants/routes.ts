export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  SECTION_DETAIL: (sectionId: number) => `/sections/${sectionId}`,
  PRACTICE: '/practice',
  RESULTS: '/results',
} as const;
