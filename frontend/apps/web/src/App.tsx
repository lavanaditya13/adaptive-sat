import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  LoginPage,
  SignupPage,
  DashboardPage,
  SectionDetailPage,
  PracticePage,
  ResultsPage,
} from '@/pages';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
      <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
      <Route path="/sections/:sectionId" element={<SectionDetailPage />} />
      <Route path={ROUTES.PRACTICE} element={<PracticePage />} />
      <Route path={ROUTES.RESULTS} element={<ResultsPage />} />
    </Routes>
  );
}
