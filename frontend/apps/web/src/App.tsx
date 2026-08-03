import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useSessionCheck } from '@/hooks/use-session-check';
import { useAuthStore } from '@/store/auth-store';
import {
  LoginPage,
  SignupPage,
  DashboardPage,
  PracticePage,
  ResultsPage,
  CheckEmailPage,
  VerifyEmailPage,
  OAuthCallbackPage,
  SettingsPage,
  LinkAccountsPage,
} from '@/pages';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <>{children}</>;
}

export function App() {
  const { isLoading } = useSessionCheck();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.SIGNUP} replace />}
      />
      <Route
        path={ROUTES.LOGIN}
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path={ROUTES.SIGNUP}
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />
      {/* Ungated: reachable regardless of current auth state — a fresh signup,
          an emailed link click, or an OAuth redirect may land here before (or
          without ever) establishing client-side session state. */}
      <Route path={ROUTES.CHECK_EMAIL} element={<CheckEmailPage />} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
      <Route path={ROUTES.OAUTH_CALLBACK} element={<OAuthCallbackPage />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PRACTICE}
        element={
          <ProtectedRoute>
            <PracticePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESULTS}
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.LINK_ACCOUNTS}
        element={
          <ProtectedRoute>
            <LinkAccountsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
