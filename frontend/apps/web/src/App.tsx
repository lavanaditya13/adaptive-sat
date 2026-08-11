import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useSessionCheck } from '@/hooks/use-session-check';
import { useAuthStore } from '@/store/auth-store';
import { AppShell } from '@/components/layout/AppShell';
import { LoggedOutScreen } from '@/components/layout/LoggedOutScreen';
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  ResultsPage,
  CheckEmailPage,
  VerifyEmailPage,
  OAuthCallbackPage,
  SettingsPage,
  LinkAccountsPage,
  PracticeSubjectPage,
  PracticeHomePage,
  PracticeDomainsPage,
  PracticeSkillsPage,
  PracticeConfirmPage,
  QuestionsPage,
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
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        }
      />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      {/* Ungated: reachable regardless of current auth state — a fresh signup,
          an emailed link click, or an OAuth redirect may land here before (or
          without ever) establishing client-side session state. */}
      <Route path={ROUTES.CHECK_EMAIL} element={<CheckEmailPage />} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
      <Route path={ROUTES.OAUTH_CALLBACK} element={<OAuthCallbackPage />} />
      <Route path={ROUTES.LOGGED_OUT} element={<LoggedOutScreen />} />

      {/* Every authenticated screen renders inside the app shell. */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PRACTICE} element={<PracticeSubjectPage />} />
        <Route path={ROUTES.PRACTICE_SESSION} element={<QuestionsPage />} />
        <Route path={ROUTES.PRACTICE_SUBJECT} element={<PracticeHomePage />} />
        <Route path={ROUTES.PRACTICE_DOMAINS} element={<PracticeDomainsPage />} />
        <Route path={ROUTES.PRACTICE_SKILLS} element={<PracticeSkillsPage />} />
        <Route path={ROUTES.PRACTICE_CONFIRM} element={<PracticeConfirmPage />} />
        <Route path={ROUTES.RESULTS} element={<ResultsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      <Route
        path={ROUTES.LINK_ACCOUNTS}
        element={
          <ProtectedRoute>
            <LinkAccountsPage />
          </ProtectedRoute>
        }
      />
      {/* Any unmatched path (stale deep link, unexpected redirect target,
          typo) lands here instead of a blank screen. */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />}
      />
    </Routes>
  );
}
