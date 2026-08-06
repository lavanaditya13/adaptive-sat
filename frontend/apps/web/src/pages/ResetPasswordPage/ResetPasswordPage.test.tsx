import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import { resetPassword } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  resetPassword: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage(path = '/reset-password?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(resetPassword).mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
  });

  it('shows a missing-token message when no token is present in the URL', () => {
    renderPage('/reset-password');

    expect(screen.getByText(/missing its reset token/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('shows the reset-password form when a token is present', () => {
    renderPage();

    expect(screen.getByText(/set a new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows a validation error when the password is too short', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('submits the token and password, shows a success toast, and navigates to login', async () => {
    vi.mocked(resetPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith('abc123', 'password123');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
      expect(navigateMock).toHaveBeenCalledWith('/login');
    });
  });

  it('shows an error toast if the reset request fails', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
