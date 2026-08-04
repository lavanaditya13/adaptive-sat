import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LinkAccountsPage } from './LinkAccountsPage';

vi.mock('@/services/auth-service', () => ({
  getOAuthStartUrl: vi.fn(),
}));

vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('LinkAccountsPage', () => {
  it('renders the add-a-sign-in-method copy and the OAuth buttons without the email divider', () => {
    render(
      <MemoryRouter>
        <LinkAccountsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/add a sign-in method/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to settings/i })).toBeInTheDocument();
  });
});
