import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { getDashboard } from '@/services/dashboard-service';
import { selectSection, startPractice } from '@/services/practice-service';
import { getStudyPlan, regenerateStudyPlan } from '@/services/study-plan-service';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';
import { MOCK_DASHBOARD, MOCK_STUDY_PLAN } from '@/mocks/mock-data';
import type { DashboardResponse } from '@/types/api';

vi.mock('@/services/dashboard-service', () => ({
  getDashboard: vi.fn(),
}));

vi.mock('@/services/practice-service', () => ({
  selectSection: vi.fn(),
  startPractice: vi.fn(),
}));

vi.mock('@/services/study-plan-service', () => ({
  getStudyPlan: vi.fn(),
  regenerateStudyPlan: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/practice/:subject" element={<p>practice subject screen</p>} />
          <Route path="/practice/session" element={<p>practice session screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getDashboard).mockReset();
    vi.mocked(selectSection).mockReset();
    vi.mocked(selectSection).mockResolvedValue({ practice_options: [], topics: [] });
    vi.mocked(startPractice).mockReset();
    vi.mocked(getStudyPlan).mockReset();
    vi.mocked(getStudyPlan).mockResolvedValue(MOCK_STUDY_PLAN);
    vi.mocked(regenerateStudyPlan).mockReset();
    useAuthStore.setState({
      user: {
        user_id: 1,
        email: 'alex@school.edu',
        full_name: 'Alex Chen',
        role: 'student',
        email_verified: true,
        oauth_provider: null,
      },
      isAuthenticated: true,
    });
  });

  it('renders the greeting, stat grid, estimated score and practice sections from the API', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);

    renderPage();

    expect(await screen.findByText('Hey, Alex 👋')).toBeInTheDocument();

    // Questions correct / tests taken / accuracy / day streak.
    expect(screen.getByText('113')).toBeInTheDocument();
    expect(screen.getByText('of 145 attempted')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('+4.2% this week')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    expect(screen.getByText('1420')).toBeInTheDocument();
    // Section names also appear as weak-topic pills, so match the cards by role.
    expect(screen.getByRole('button', { name: /^math/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reading & writing/i })).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('routes into the practice flow for the chosen section', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /math/i }));

    expect(screen.getByText('practice subject screen')).toBeInTheDocument();
  });

  it('replaces the estimated score with an empty state before any questions are answered', async () => {
    const emptyDashboard: DashboardResponse = {
      ...MOCK_DASHBOARD,
      progress: {
        sessions_completed: 0,
        questions_answered: 0,
        accuracy_percentage: 0,
        questions_correct: 0,
        accuracy_trend_percentage: 0,
        avg_session_minutes: 0,
        day_streak: 0,
      },
    };
    vi.mocked(getDashboard).mockResolvedValue(emptyDashboard);

    renderPage();

    expect(await screen.findByText('No practice data yet')).toBeInTheDocument();
    expect(screen.queryByText('Estimated SAT Score')).not.toBeInTheDocument();
    expect(screen.getByText('Practice today to start one')).toBeInTheDocument();
  });

  it('deep-links a weak topic into a practice session for that topic', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    vi.mocked(startPractice).mockResolvedValue({} as never);
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Practice Algebra' }));

    /* Selecting the section first is what makes the positional topic_id
       resolve against the right section — see DashboardPage. */
    await waitFor(() => expect(selectSection).toHaveBeenCalledWith(1));
    expect(startPractice).toHaveBeenCalledWith({ mode: 'topic', topic_id: 1 });
    expect(await screen.findByText('practice session screen')).toBeInTheDocument();
  });

  it('reports an in-progress session instead of stranding the student on a 409', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    vi.mocked(startPractice).mockRejectedValue(
      Object.assign(new Error('conflict'), {
        isAxiosError: true,
        response: { status: 409, data: {} },
      })
    );
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Practice Algebra' }));

    await waitFor(() => {
      expect(useAppShellStore.getState().toastMessage).toMatch(/already have a practice session/i);
    });
    expect(screen.queryByText('practice session screen')).not.toBeInTheDocument();
  });

  it('hides the focus areas card before any questions are answered', async () => {
    vi.mocked(getDashboard).mockResolvedValue({
      ...MOCK_DASHBOARD,
      progress: { ...MOCK_DASHBOARD.progress, questions_answered: 0 },
    });

    renderPage();

    expect(await screen.findByText('Hey, Alex 👋')).toBeInTheDocument();
    expect(screen.queryByText('Focus areas')).not.toBeInTheDocument();
  });

  it('renders the study plan returned by the API', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);

    renderPage();

    expect(await screen.findByText('Study plan')).toBeInTheDocument();
    // The topic name (Algebra) also appears in the weak-topics card above, so
    // assert on the reason string, which only the study plan card renders.
    expect(screen.getByText(MOCK_STUDY_PLAN.items[0].reason)).toBeInTheDocument();
  });

  it('regenerates the study plan and swaps in the fresh result', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    const regenerated = {
      ...MOCK_STUDY_PLAN,
      items: [
        {
          topic_id: 55,
          topic_name: 'Freshly Regenerated Topic',
          priority: 'high' as const,
          recommended_questions: 20,
          reason: 'Mastery score is 10%, so this topic should be reviewed.',
        },
      ],
    };
    vi.mocked(regenerateStudyPlan).mockResolvedValue(regenerated);
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Regenerate' }));

    expect(regenerateStudyPlan).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Freshly Regenerated Topic')).toBeInTheDocument();
  });

  it('shows a retryable error instead of dashboard content when the query fails', async () => {
    vi.mocked(getDashboard).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument();
    expect(screen.queryByText('Practice Sections')).not.toBeInTheDocument();

    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Practice Sections')).toBeInTheDocument();
    });
  });
});
