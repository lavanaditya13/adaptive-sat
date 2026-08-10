import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { getDashboard } from '@/services/dashboard-service';
import { useAuthStore } from '@/store/auth-store';
import { MOCK_DASHBOARD } from '@/mocks/mock-data';
import type { DashboardResponse } from '@/types/api';

vi.mock('@/services/dashboard-service', () => ({
  getDashboard: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/practice/:subject" element={<p>practice subject screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getDashboard).mockReset();
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
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Reading & Writing')).toBeInTheDocument();
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
