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

  it('blocks disconnecting when Google is the only sign-in method and shows a tip on hover', async () => {
    const user = userEvent.setup();
    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: null }]}
        hasPassword={false}
        onUnlinked={vi.fn()}
      />
    );

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    expect(disconnectButton).toBeDisabled();
    expect(screen.queryByText(/add another sign-in method/i)).not.toBeInTheDocument();

    await user.hover(disconnectButton.parentElement as HTMLElement);
    expect(screen.getByText(/add another sign-in method before disconnecting google/i)).toBeInTheDocument();

    await user.click(disconnectButton);
    expect(unlinkProvider).not.toHaveBeenCalled();
    expect(screen.queryByText(/disconnect from google\?/i)).not.toBeInTheDocument();
  });

  it('opens a confirmation dialog before disconnecting, and does nothing on cancel', async () => {
    const user = userEvent.setup();
    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: null }]}
        hasPassword={true}
        onUnlinked={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /disconnect/i }));
    expect(screen.getByText(/disconnect from google\?/i)).toBeInTheDocument();
    expect(unlinkProvider).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/disconnect from google\?/i)).not.toBeInTheDocument();
    expect(unlinkProvider).not.toHaveBeenCalled();
  });

  it('calls unlinkProvider and onUnlinked after confirming in the dialog, then shows a success toast', async () => {
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
    const dialogButtons = screen.getAllByRole('button', { name: /disconnect/i });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(unlinkProvider).toHaveBeenCalledWith('google');
      expect(onUnlinked).toHaveBeenCalledWith('google');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
    });
  });

  it('shows an error toast if unlinking fails', async () => {
    vi.mocked(unlinkProvider).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    render(
      <ConnectedProvidersList
        providers={[{ provider: 'google', linked_at: '2026-01-01T00:00:00Z', email: null }]}
        hasPassword={true}
        onUnlinked={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /disconnect/i }));
    const dialogButtons = screen.getAllByRole('button', { name: /disconnect/i });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
