import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const setUserMock = vi.fn();
const showToastMock = vi.fn();

let mockUser = {
  user_id: 1,
  email: 'alex@example.com',
  full_name: 'Alex Chen',
  role: 'student' as const,
  email_verified: true,
  oauth_provider: null,
};

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser; setUser: typeof setUserMock }) => unknown) =>
    selector({ user: mockUser, setUser: setUserMock }),
}));

vi.mock('@/store/app-shell-store', () => ({
  useAppShellStore: (selector: (state: { showToast: typeof showToastMock }) => unknown) =>
    selector({ showToast: showToastMock }),
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
    setUserMock.mockReset();
    showToastMock.mockReset();
    mockUser = {
      user_id: 1,
      email: 'alex@example.com',
      full_name: 'Alex Chen',
      role: 'student',
      email_verified: true,
      oauth_provider: null,
    };
  });

  it('shows the profile fields and connected providers once loaded', async () => {
    vi.mocked(getConnectedProviders).mockResolvedValue({
      providers: [{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: 'alex@example.com' }],
      has_password: true,
    });

    renderPage();

    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chen')).toBeInTheDocument();
    expect(screen.getAllByText('alex@example.com').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('shows an error message if loading connected providers fails', async () => {
    vi.mocked(getConnectedProviders).mockRejectedValue(new Error('network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/couldn.t load your settings/i)).toBeInTheDocument();
    });
  });

  it('reveals the unsaved-changes bar when the name is edited, then hides it and toasts on save', async () => {
    vi.mocked(getConnectedProviders).mockResolvedValue({ providers: [], has_password: true });
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    const lastNameField = await screen.findByLabelText(/last name/i);
    await user.clear(lastNameField);
    await user.type(lastNameField, 'Rivera');

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Alex Rivera' }));
    expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/profile updated/i));
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('does not reveal the unsaved-changes bar when the name is unchanged', async () => {
    vi.mocked(getConnectedProviders).mockResolvedValue({ providers: [], has_password: true });
    const user = userEvent.setup();
    renderPage();

    const firstNameField = await screen.findByLabelText(/first name/i);
    await user.click(firstNameField);
    await user.tab();

    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    expect(setUserMock).not.toHaveBeenCalled();
  });
});
