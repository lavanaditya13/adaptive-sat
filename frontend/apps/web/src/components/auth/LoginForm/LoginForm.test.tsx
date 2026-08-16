import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { login } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { INVALID_CREDENTIALS_DESCRIPTION } from './LoginForm.constants';

function unauthorizedError(detail: string) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { detail },
    } as never
  );
}

vi.mock('@/services/auth-service', () => ({
  login: vi.fn(),
  getOAuthStartUrl: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const USER = {
  user_id: 1,
  email: 'student@example.com',
  full_name: 'Test Student',
  role: 'student' as const,
  email_verified: true,
  oauth_provider: null,
};

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
    useAuthStore.getState().clearUser();
  });

  it('renders the email and password fields plus the submit button', () => {
    renderLoginForm();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors and does not submit when the fields are empty', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials, stores the user, and navigates to the dashboard', async () => {
    vi.mocked(login).mockResolvedValue(USER);
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'password123',
      });
    });
    expect(useAuthStore.getState().user).toEqual(USER);
    expect(navigateMock).toHaveBeenCalled();
  });

  it('shows an error toast when logging in fails', async () => {
    vi.mocked(login).mockRejectedValue(new Error('bad credentials'));
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });

  it('nudges toward signup on invalid credentials without revealing whether the account exists', async () => {
    // The backend returns the same generic 401 whether the password is wrong
    // or no account exists for that email -- this only asserts the frontend
    // adds a signup nudge on top of that message, not that it distinguishes
    // the two cases (it must not).
    vi.mocked(login).mockRejectedValue(unauthorizedError('Incorrect email or password'));
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: INVALID_CREDENTIALS_DESCRIPTION,
        })
      );
    });
  });
});
