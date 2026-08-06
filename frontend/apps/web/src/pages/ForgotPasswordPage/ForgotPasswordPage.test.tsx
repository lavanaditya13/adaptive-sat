import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { requestPasswordReset } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  requestPasswordReset: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
  });

  it('shows the forgot-password form', () => {
    renderPage();

    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows a validation error and does not call the API for an invalid email', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('submits the email, shows a success toast, and navigates to login', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'student@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('student@example.com');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
      expect(navigateMock).toHaveBeenCalledWith('/login');
    });
  });

  it('shows an error toast if the request fails', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'student@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
