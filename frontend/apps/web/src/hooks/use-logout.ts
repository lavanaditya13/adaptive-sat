import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@/services/auth-service';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import { useResultsStore } from '@/store/results-store';

/**
 * Single logout path for every shell surface (user menu, mobile drawer,
 * profile sheet): clears client state even if the API call fails, then lands
 * on the logged-out screen.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);
  const resetPracticeSession = usePracticeSessionStore((state) => state.resetSession);
  const clearResults = useResultsStore((state) => state.clearResults);
  const closeAllOverlays = useAppShellStore((state) => state.closeAllOverlays);

  return useCallback(async () => {
    try {
      await logout();
    } finally {
      closeAllOverlays();
      clearUser();
      resetPracticeSession();
      clearResults();
      queryClient.removeQueries({ queryKey: queryKeys.auth.user });
      queryClient.removeQueries({ queryKey: queryKeys.dashboard.all });
      // Per-student scores — dropping the store alone would leave the next
      // sign-in on this device rendering the previous student's results from
      // cache before their own fetch resolves.
      queryClient.removeQueries({ queryKey: queryKeys.practice.latestResult });
      navigate(ROUTES.LOGGED_OUT, { replace: true });
    }
  }, [
    clearResults,
    clearUser,
    closeAllOverlays,
    navigate,
    queryClient,
    resetPracticeSession,
  ]);
}
