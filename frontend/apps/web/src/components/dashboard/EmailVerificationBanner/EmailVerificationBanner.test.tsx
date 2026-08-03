import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { resendVerificationEmail } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  resendVerificationEmail: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.mocked(resendVerificationEmail).mockReset();
    toastMock.mockReset();
  });

  it('renders the verify-your-email message and a resend button', () => {
    render(<EmailVerificationBanner />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('calls resendVerificationEmail and shows a success toast on click', async () => {
    vi.mocked(resendVerificationEmail).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<EmailVerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(resendVerificationEmail).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
    });
  });

  it('shows an error toast if resend fails', async () => {
    vi.mocked(resendVerificationEmail).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    render(<EmailVerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
