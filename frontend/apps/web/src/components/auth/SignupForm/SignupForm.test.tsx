import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SignupForm } from './SignupForm';
import { signup } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  signup: vi.fn(),
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
  email_verified: false,
  oauth_provider: null,
};

function renderSignupForm() {
  return render(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>
  );
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.mocked(signup).mockReset();
    toastMock.mockReset();
    navigateMock.mockReset();
  });

  it('renders the name, email, password and role fields plus the submit button', () => {
    renderSignupForm();

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Student' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows a validation error when the password is too short', async () => {
    const user = userEvent.setup();
    renderSignupForm();

    await user.type(screen.getByLabelText('Full Name'), 'Test Student');
    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it('submits valid details and navigates to the check-email step', async () => {
    vi.mocked(signup).mockResolvedValue(USER);
    const user = userEvent.setup();
    renderSignupForm();

    await user.type(screen.getByLabelText('Full Name'), 'Test Student');
    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith({
        full_name: 'Test Student',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
      });
    });
    expect(navigateMock).toHaveBeenCalled();
  });

  it('shows an error toast when signing up fails', async () => {
    vi.mocked(signup).mockRejectedValue(new Error('email already registered'));
    const user = userEvent.setup();
    renderSignupForm();

    await user.type(screen.getByLabelText('Full Name'), 'Test Student');
    await user.type(screen.getByLabelText('Email'), 'student@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
