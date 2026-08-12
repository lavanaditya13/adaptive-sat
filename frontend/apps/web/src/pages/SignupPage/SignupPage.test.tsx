import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';

vi.mock('@/services/auth-service', () => ({
  signup: vi.fn(),
  getOAuthStartUrl: vi.fn(),
}));

vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>
  );
}

describe('SignupPage', () => {
  it('renders the signup-specific hero copy alongside the signup form', () => {
    renderPage();

    expect(screen.getByText(/start studying with a/i)).toBeInTheDocument();
    expect(screen.getByText(/plan built for you\./i)).toBeInTheDocument();
    expect(screen.getByText(/adaptive practice plan/i)).toBeInTheDocument();
  });

  it('renders the signup form fields and submit button', () => {
    renderPage();

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});
