import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './AppShell';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

function renderShell(initialPath = '/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<p>dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    useAppShellStore.setState({
      isMobile: false,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      profileSheetOpen: false,
      userMenuOpen: false,
      toastMessage: null,
      trailingCrumbLabel: null,
    });
    useAuthStore.setState({
      user: {
        user_id: 1,
        email: 'alex@school.edu',
        full_name: 'Alex Chen',
        role: 'student',
        email_verified: true,
        oauth_provider: null,
      },
      isAuthenticated: true,
    });
  });

  it('renders the sidebar, breadcrumbs and routed content on desktop', () => {
    renderShell();

    expect(screen.getByRole('complementary', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Dashboard'
    );
    expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument();
  });

  it('shows the user identity in the sidebar footer', () => {
    renderShell();

    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@school.edu')).toBeInTheDocument();
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('collapses the sidebar from the header trigger on desktop', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    expect(useAppShellStore.getState().sidebarCollapsed).toBe(true);
    expect(screen.queryByText('Alex Chen')).not.toBeInTheDocument();
  });

  it('swaps the sidebar for the tab bar on mobile and opens the drawer', async () => {
    mockMatchMedia(true);
    useAppShellStore.setState({ isMobile: true });
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('complementary', { name: /main navigation/i })).toBeNull();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeInTheDocument();
  });

  it('opens the profile sheet from the mobile Profile tab', async () => {
    mockMatchMedia(true);
    useAppShellStore.setState({ isMobile: true });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /profile/i }));

    expect(screen.getByRole('dialog', { name: /profile/i })).toBeInTheDocument();
  });

  it('renders a shell toast while a message is queued', () => {
    useAppShellStore.setState({ toastMessage: 'Support: support@scoreup.sat' });
    renderShell();

    expect(screen.getByRole('status')).toHaveTextContent('support@scoreup.sat');
  });
});
