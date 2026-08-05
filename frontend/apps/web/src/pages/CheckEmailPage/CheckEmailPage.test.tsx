import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CheckEmailPage } from './CheckEmailPage';
import { resendVerificationEmailByEmail } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  resendVerificationEmailByEmail: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/check-email?email=student@example.com']}>
      <CheckEmailPage />
    </MemoryRouter>
  );
}

describe('CheckEmailPage', () => {
  beforeEach(() => {
    vi.mocked(resendVerificationEmailByEmail).mockReset();
    toastMock.mockReset();
  });

  it('shows the check-your-email confirmation copy', () => {
    renderPage();

    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  it('calls resendVerificationEmailByEmail and shows a success toast on click', async () => {
    vi.mocked(resendVerificationEmailByEmail).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /resend email/i }));

    await waitFor(() => {
      expect(resendVerificationEmailByEmail).toHaveBeenCalledWith('student@example.com');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
    });
  });

  it('shows an error toast if resend fails', async () => {
    vi.mocked(resendVerificationEmailByEmail).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /resend email/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
