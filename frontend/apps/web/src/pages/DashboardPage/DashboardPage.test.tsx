import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { getDashboard } from '@/services/dashboard-service';
import { MOCK_DASHBOARD } from '@/mocks/mock-data';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/dashboard-service', () => ({
  getDashboard: vi.fn(),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { email_verified: boolean } }) => unknown) =>
    selector({ user: { email_verified: true } }),
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
    navigateMock.mockReset();
  });

  it('navigates to the section practice home instead of starting practice or opening a dialog', async () => {
    vi.mocked(getDashboard).mockResolvedValue(MOCK_DASHBOARD);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Math'));
    await user.click(screen.getByText('Math'));

    expect(navigateMock).toHaveBeenCalledWith('/practice/math');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
});
