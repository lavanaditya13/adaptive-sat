import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuthButtons } from './OAuthButtons';
import { getOAuthStartUrl } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';

vi.mock('@/services/auth-service', () => ({
  getOAuthStartUrl: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: vi.fn(() => ({ toast: toastMock })),
}));

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.mocked(getOAuthStartUrl).mockReset();
    toastMock.mockReset();
    vi.mocked(useToast).mockReturnValue({ toast: toastMock });
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });
  });

  it('renders Google and Apple buttons plus the divider by default', () => {
    render(<OAuthButtons intent="login" />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
  });

  it('hides the divider when showDivider is false', () => {
    render(<OAuthButtons intent="login" showDivider={false} />);

    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument();
  });

  it('redirects to the resolved Google OAuth URL for the given intent', async () => {
    vi.mocked(getOAuthStartUrl).mockResolvedValue('https://api.example.com/api/v1/auth/google?intent=signup');
    const user = userEvent.setup();

    render(<OAuthButtons intent="signup" />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(getOAuthStartUrl).toHaveBeenCalledWith('google', 'signup');
      expect(window.location.href).toBe('https://api.example.com/api/v1/auth/google?intent=signup');
    });
  });

  it('redirects to the resolved Apple OAuth URL', async () => {
    vi.mocked(getOAuthStartUrl).mockResolvedValue('https://api.example.com/api/v1/auth/apple?intent=login');
    const user = userEvent.setup();

    render(<OAuthButtons intent="login" />);
    await user.click(screen.getByRole('button', { name: /continue with apple/i }));

    await waitFor(() => {
      expect(getOAuthStartUrl).toHaveBeenCalledWith('apple', 'login');
      expect(window.location.href).toBe('https://api.example.com/api/v1/auth/apple?intent=login');
    });
  });

  it('shows an error toast and re-enables the buttons if resolving the OAuth URL fails', async () => {
    vi.mocked(getOAuthStartUrl).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    render(<OAuthButtons intent="login" />);
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
    expect(googleButton).not.toBeDisabled();
  });
});
