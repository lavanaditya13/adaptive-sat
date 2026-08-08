import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { getDashboard } from '@/services/dashboard-service';
import { logout } from '@/services/auth-service';
import { MOCK_DASHBOARD } from '@/mocks/mock-data';

vi.mock('@/services/dashboard-service', () => ({
  getDashboard: vi.fn(),
}));

vi.mock('@/services/auth-service', () => ({
  logout: vi.fn(),
}));

const clearUserMock = vi.fn();
vi.mock('@/store/auth-store', () => ({
  useAuthStore: (
    selector: (state: { user: { email_verified: boolean }; clearUser: () => void }) => unknown
  ) => selector({ user: { email_verified: true }, clearUser: clearUserMock }),
}));

const resetSessionMock = vi.fn();
vi.mock('@/store/practice-session-store', () => ({
  usePracticeSessionStore: (selector: (state: { resetSession: () => void }) => unknown) =>
    selector({ resetSession: resetSessionMock }),
}));

const clearResultsMock = vi.fn();
vi.mock('@/store/results-store', () => ({
  useResultsStore: (selector: (state: { clearResults: () => void }) => unknown) =>
    selector({ clearResults: clearResultsMock }),
}));

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
    vi.mocked(logout).mockReset();
    clearUserMock.mockReset();
    resetSessionMock.mockReset();
    clearResultsMock.mockReset();
  });

  it('renders the greeting, progress stats, and practice sections once loaded', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Hey, Alex Student 👋')).toBeInTheDocument();
    });

    expect(screen.getByText('113')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Reading & Writing')).toBeInTheDocument();
  });

  it('shows an error message instead of dashboard content when the query fails', async () => {
    vi.mocked(getDashboard).mockRejectedValue(new Error('network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Practice Sections')).not.toBeInTheDocument();
  });

  it('clears local session state and navigates away on logout, even if the request itself fails', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    vi.mocked(logout).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Hey, Alex Student 👋')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(clearUserMock).toHaveBeenCalledTimes(1);
    });
    expect(resetSessionMock).toHaveBeenCalledTimes(1);
    expect(clearResultsMock).toHaveBeenCalledTimes(1);
  });
});
