import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { getDashboard } from '@/services/dashboard-service';
import { selectSection } from '@/services/practice-service';
import type { DashboardResponse } from '@/types/api';
import { SECTIONS_TITLE, QUESTIONS_CORRECT_LABEL, DAY_STREAK_LABEL } from './DashboardPage.constants';

vi.mock('@/services/dashboard-service', () => ({
  getDashboard: vi.fn(),
}));

vi.mock('@/services/practice-service', () => ({
  selectSection: vi.fn(),
  startPractice: vi.fn(),
}));

vi.mock('@/services/auth-service', () => ({
  logout: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (
    selector: (state: {
      user: { full_name: string; email: string; email_verified: boolean } | null;
      clearUser: () => void;
    }) => unknown
  ) =>
    selector({
      user: { full_name: 'Alex Student', email: 'alex@example.com', email_verified: true },
      clearUser: vi.fn(),
    }),
}));

const DASHBOARD: DashboardResponse = {
  student: { full_name: 'Alex Student' },
  progress: {
    sessions_completed: 12,
    questions_answered: 145,
    accuracy_percentage: 78,
    questions_correct: 113,
    accuracy_trend_percentage: 4.2,
    avg_session_minutes: 25,
    day_streak: 14,
  },
  weak_topics: [{ topic_id: 1, display_name: 'Linear Equations', mastery_score: 45 }],
  sections: [
    {
      section_id: 1,
      name: 'math',
      display_name: 'Math',
      accuracy_percentage: 82,
      questions_completed: 148,
      topics_count: 5,
    },
  ],
  estimated_score: {
    estimated_score: 1420,
    target_score: 1520,
    points_to_go: 100,
    percent_to_goal: 93,
  },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getDashboard).mockReset();
    vi.mocked(selectSection).mockReset();
  });

  it('renders the greeting, progress stats, estimated score, and practice sections', async () => {
    vi.mocked(getDashboard).mockResolvedValue(DASHBOARD);

    renderPage();

    expect(await screen.findByText(/alex student/i)).toBeInTheDocument();
    expect(screen.getByText(QUESTIONS_CORRECT_LABEL)).toBeInTheDocument();
    expect(screen.getByText('113')).toBeInTheDocument();
    expect(screen.getByText(DAY_STREAK_LABEL)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('1420')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
    expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    expect(screen.getByText(SECTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
  });

  it('shows an error message when the dashboard fails to load', async () => {
    vi.mocked(getDashboard).mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
    });
  });

  it('opens the practice modal when a section card is clicked', async () => {
    vi.mocked(getDashboard).mockResolvedValue(DASHBOARD);
    vi.mocked(selectSection).mockResolvedValue({
      practice_options: [
        {
          mode: 'section',
          title: 'Full Section Practice',
          description: 'Mixed questions across every topic',
          is_locked: false,
          question_count: 20,
        },
      ],
      topics: [],
    });
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderPage();
    await user.click(await screen.findByText('Math'));

    expect(await screen.findByText('Full Section Practice')).toBeInTheDocument();
    expect(selectSection).toHaveBeenCalledWith(1);
  });
});
