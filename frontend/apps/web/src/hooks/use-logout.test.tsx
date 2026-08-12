import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogout } from './use-logout';
import { logout } from '@/services/auth-service';
import { queryKeys } from '@/constants/query-keys';
import { useResultsStore } from '@/store/results-store';
import { MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/auth-service', () => ({
  logout: vi.fn(),
}));

function renderUseLogout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  const { result } = renderHook(() => useLogout(), { wrapper });
  return { logoutFn: result.current, queryClient };
}

describe('useLogout', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(logout).mockResolvedValue(undefined as never);
    useResultsStore.getState().clearResults();
  });

  it('drops the cached practice results so the next student on this device cannot see them', async () => {
    const { logoutFn, queryClient } = renderUseLogout();
    queryClient.setQueryData(queryKeys.practice.latestResult, MOCK_COMPLETE_RESPONSE);
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    await act(async () => {
      await logoutFn();
    });

    expect(queryClient.getQueryData(queryKeys.practice.latestResult)).toBeUndefined();
    expect(useResultsStore.getState().latestResult).toBeNull();
  });

  it('still clears them when the logout request itself fails', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('network down'));

    const { logoutFn, queryClient } = renderUseLogout();
    queryClient.setQueryData(queryKeys.practice.latestResult, MOCK_COMPLETE_RESPONSE);

    await act(async () => {
      await expect(logoutFn()).rejects.toThrow('network down');
    });

    expect(queryClient.getQueryData(queryKeys.practice.latestResult)).toBeUndefined();
  });
});
