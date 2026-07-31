import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { queryKeys } from '@/constants/query-keys';

// Verifies the access_token cookie (if any) against the backend once on load,
// so a page refresh or a fresh tab doesn't lose auth state even though
// useAuthStore itself isn't persisted. Fails closed: any error (401, network,
// etc.) is treated as "not authenticated" rather than falling back to mock data.
export function useSessionCheck() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (isError) {
      clearUser();
    }
  }, [data, isError, setUser, clearUser]);

  return { isLoading: isPending };
}
