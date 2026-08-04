import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectedProvidersList } from './ConnectedProvidersList';
import { unlinkProvider } from '@/services/settings-service';

vi.mock('@/services/settings-service', () => ({
  unlinkProvider: vi.fn(),
}));

const toastMock = vi.fn();
vi.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe('ConnectedProvidersList', () => {
  beforeEach(() => {
    vi.mocked(unlinkProvider).mockReset();
    toastMock.mockReset();
  });

  it('shows the empty state when there are no providers', () => {
    render(<ConnectedProvidersList providers={[]} hasPassword={true} onUnlinked={vi.fn()} />);

    expect(screen.getByText(/no providers connected/i)).toBeInTheDocument();
  });

  it('renders each connected provider with a disconnect button', () => {
    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: 'a@example.com' }]}
        hasPassword={true}
        onUnlinked={vi.fn()}
      />
    );

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeEnabled();
  });

  it('disables disconnect when the provider is the only auth method', () => {
    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: null }]}
        hasPassword={false}
        onUnlinked={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeDisabled();
  });

  it('calls unlinkProvider and onUnlinked, then shows a success toast', async () => {
    vi.mocked(unlinkProvider).mockResolvedValue(undefined);
    const onUnlinked = vi.fn();
    const user = userEvent.setup();

    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: null }]}
        hasPassword={true}
        onUnlinked={onUnlinked}
      />
    );

    await user.click(screen.getByRole('button', { name: /disconnect/i }));

    await waitFor(() => {
      expect(unlinkProvider).toHaveBeenCalledWith('google');
      expect(onUnlinked).toHaveBeenCalledWith('google');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
    });
  });
});
