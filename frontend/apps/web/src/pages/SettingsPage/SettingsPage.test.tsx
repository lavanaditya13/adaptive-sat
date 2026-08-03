import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './SettingsPage';
import { getConnectedProviders } from '@/services/settings-service';

vi.mock('@/services/settings-service', () => ({
  getConnectedProviders: vi.fn(),
  unlinkProvider: vi.fn(),
}));

vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (
    selector: (state: {
      user: { full_name: string; email: string; email_verified: boolean };
    }) => unknown
  ) =>
    selector({
      user: { full_name: 'Alex Student', email: 'alex@example.com', email_verified: false },
    }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(getConnectedProviders).mockReset();
  });

  it('shows the account email/name and unverified badge, then the connected providers once loaded', async () => {
    vi.mocked(getConnectedProviders).mockResolvedValue({
      providers: [{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: 'alex@example.com' }],
      has_password: true,
    });

    renderPage();

    expect(screen.getByText('Alex Student')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /add a sign-in method/i })).toBeInTheDocument();
  });

  it('shows an error message if loading connected providers fails', async () => {
    vi.mocked(getConnectedProviders).mockRejectedValue(new Error('network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/couldn.t load your settings/i)).toBeInTheDocument();
    });
  });
});
