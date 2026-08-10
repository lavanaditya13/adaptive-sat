import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSubjectPage } from './PracticeSubjectPage';
import { getDashboard } from '@/services/dashboard-service';
import type { DashboardResponse } from '@/types/api';

vi.mock('@/services/dashboard-service', () => ({ getDashboard: vi.fn() }));

const mockedGetDashboard = vi.mocked(getDashboard);

const SECTIONS: DashboardResponse['sections'] = [
  {
    section_id: 1,
    name: 'math',
    display_name: 'Math',
    accuracy_percentage: 84,
    questions_completed: 38,
    topics_count: 4,
  },
  {
    section_id: 2,
    name: 'reading_writing',
    display_name: 'Reading & Writing',
    accuracy_percentage: 61,
    questions_completed: 0,
    topics_count: 4,
  },
];

function dashboardWith(sections: DashboardResponse['sections']): DashboardResponse {
  return {
    student: { full_name: 'Alex Chen' },
    progress: {
      sessions_completed: 2,
      questions_answered: 38,
      accuracy_percentage: 84,
      questions_correct: 32,
      accuracy_trend_percentage: 1,
      avg_session_minutes: 12,
      day_streak: 3,
    },
    weak_topics: [],
    sections,
    estimated_score: {
      estimated_score: 1200,
      target_score: 1400,
      points_to_go: 200,
      percent_to_goal: 85,
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice']}>
        <Routes>
          <Route path="/practice" element={<PracticeSubjectPage />} />
          <Route path="/practice/:subject" element={<p>practice home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeSubjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a card per section from the dashboard with its real stats', async () => {
    mockedGetDashboard.mockResolvedValue(dashboardWith(SECTIONS));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Math' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reading & Writing' })).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    /* Reading has no attempts yet, so accuracy reads as "no data" rather than 61%. */
    expect(screen.queryByText('61%')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('routes to the subject practice home when a card is clicked', async () => {
    mockedGetDashboard.mockResolvedValue(dashboardWith(SECTIONS));

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Math/ }));

    expect(await screen.findByText('practice home')).toBeInTheDocument();
  });

  it('shows an empty state when the API returns no sections', async () => {
    mockedGetDashboard.mockResolvedValue(dashboardWith([]));

    renderPage();

    expect(await screen.findByText('No sections available yet')).toBeInTheDocument();
  });
});
