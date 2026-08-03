import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OAuthCallbackPage } from './OAuthCallbackPage';
import { getCurrentUser } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  getCurrentUser: vi.fn(),
}));

const setUserMock = vi.fn();
vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { setUser: typeof setUserMock }) => unknown) =>
    selector({ setUser: setUserMock }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    setUserMock.mockReset();
  });

  it('shows a loading state and confirms the session on mount', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      user_id: 1,
      email: 'a@example.com',
      full_name: 'A',
      role: 'student',
      email_verified: true,
      oauth_provider: 'google',
    });

    renderAt('/oauth/callback');

    expect(screen.getByText(/finishing sign-in/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(setUserMock).toHaveBeenCalled();
    });
  });

  it('shows an error state immediately when status=error is present', async () => {
    renderAt('/oauth/callback?status=error&reason=access_denied');

    await waitFor(() => {
      expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument();
      expect(screen.getByText(/cancelled the sign-in request/i)).toBeInTheDocument();
    });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('shows an error state if session confirmation fails', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('no session'));

    renderAt('/oauth/callback');

    await waitFor(() => {
      expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument();
    });
  });
});
