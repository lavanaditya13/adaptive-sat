import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VerifyEmailPage } from './VerifyEmailPage';
import { verifyEmail, resendVerificationEmail } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

const setUserMock = vi.fn();
vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { setUser: typeof setUserMock }) => unknown) =>
    selector({ setUser: setUserMock }),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.mocked(verifyEmail).mockReset();
    vi.mocked(resendVerificationEmail).mockReset();
    setUserMock.mockReset();
    toastMock.mockReset();
  });

  it('shows a loading state immediately, then success once verifyEmail resolves', async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      user_id: 1,
      email: 'a@example.com',
      full_name: 'A',
      role: 'student',
      email_verified: true,
      oauth_provider: null,
    });

    renderAt('/verify-email?token=abc123');

    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(verifyEmail).toHaveBeenCalledWith('abc123');
      expect(setUserMock).toHaveBeenCalled();
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });
  });

  it('shows an error state with a resend option when the token is missing', async () => {
    renderAt('/verify-email');

    await waitFor(() => {
      expect(screen.getByText(/couldn.t verify your email/i)).toBeInTheDocument();
    });
    expect(verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('shows an error state when verifyEmail rejects', async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new Error('expired'));

    renderAt('/verify-email?token=expired-token');

    await waitFor(() => {
      expect(screen.getByText(/couldn.t verify your email/i)).toBeInTheDocument();
    });
  });
});
