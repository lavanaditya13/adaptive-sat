import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeHomePage } from './PracticeHomePage';
import { getDashboard } from '@/services/dashboard-service';
import { selectSection } from '@/services/practice-service';
import { getSkillTree } from '@/components/practice-entry/practice-entry-service';
import type { DashboardResponse, PracticeOption, SectionContextResponse } from '@/types/api';
import type { SkillTreeResponse } from '@/components/practice-entry/practice-entry.types';

vi.mock('@/services/dashboard-service', () => ({ getDashboard: vi.fn() }));
vi.mock('@/services/practice-service', () => ({ selectSection: vi.fn() }));
vi.mock('@/components/practice-entry/practice-entry-service', () => ({ getSkillTree: vi.fn() }));

const mockedGetDashboard = vi.mocked(getDashboard);
const mockedSelectSection = vi.mocked(selectSection);
const mockedGetSkillTree = vi.mocked(getSkillTree);

const DASHBOARD: DashboardResponse = {
  student: { full_name: 'Alex Chen' },
  progress: {
    sessions_completed: 1,
    questions_answered: 38,
    accuracy_percentage: 84,
    questions_correct: 32,
    accuracy_trend_percentage: 1,
    avg_session_minutes: 12,
    day_streak: 3,
  },
  weak_topics: [],
  sections: [
    {
      section_id: 1,
      name: 'math',
      display_name: 'Math',
      accuracy_percentage: 84,
      questions_completed: 38,
      topics_count: 4,
    },
  ],
  estimated_score: {
    estimated_score: 1200,
    target_score: 1400,
    points_to_go: 200,
    percent_to_goal: 85,
  },
};

/* Four domains, matching the real seeded data rather than the five in the mock. */
const SKILL_TREE: SkillTreeResponse = {
  section: 'math',
  sectionDisplayName: 'Math',
  masteryRule: { accuracy: 85, minQuestions: 10 },
  domains: ['Algebra', 'Advanced Math', 'Problem Solving & Data', 'Geometry & Trigonometry'].map(
    (name, index) => ({
      name,
      topicId: index + 1,
      topicCode: name.toUpperCase(),
      accuracy: 80,
      questionsAttempted: 10,
      questionsCorrect: 8,
      mastered: false,
      skills: [],
    })
  ),
};

const SECTION_OPTION: PracticeOption = {
  mode: 'section',
  title: 'Math Section Practice',
  description: 'Practice questions across the full Math section.',
  is_locked: false,
  question_count: 5,
};

function contextWith(adaptive: PracticeOption): SectionContextResponse {
  return { practice_options: [SECTION_OPTION, adaptive], topics: [] };
}

function renderPage(path = '/practice/math') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/practice" element={<p>subject picker</p>} />
          <Route path="/practice/:subject" element={<PracticeHomePage />} />
          <Route path="/practice/:subject/domains" element={<p>domains screen</p>} />
          <Route path="/practice/:subject/confirm" element={<p>confirm screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetDashboard.mockResolvedValue(DASHBOARD);
    mockedGetSkillTree.mockResolvedValue(SKILL_TREE);
  });

  it('renders the section header with the real domain count and question total', async () => {
    mockedSelectSection.mockResolvedValue(
      contextWith({
        mode: 'adaptive',
        title: 'Adaptive Math Practice',
        description: 'Weakest areas.',
        is_locked: false,
        question_count: 5,
      })
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Math' })).toBeInTheDocument();
    expect(screen.getByText('4 domains · 38 questions done')).toBeInTheDocument();
    /* The card's accessible name is built from all of its text, so match loosely. */
    expect(screen.getByRole('button', { name: /Browse 4 Domains/ })).toBeInTheDocument();
  });

  it('renders adaptive practice as locked using the server-supplied unlock requirement', async () => {
    mockedSelectSection.mockResolvedValue(
      contextWith({
        mode: 'adaptive',
        title: 'Adaptive Math Practice',
        description: 'Weakest areas.',
        is_locked: true,
        question_count: 5,
        unlock_requirement: {
          required_sessions: 3,
          completed_sessions: 1,
          remaining_sessions: 2,
        },
      })
    );

    renderPage();

    expect(
      await screen.findByText('Complete 2 more general sessions to unlock adaptive practice.')
    ).toBeInTheDocument();
    expect(screen.getByText('1 / 3 sessions')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Start Adaptive Practice' })
    ).not.toBeInTheDocument();
  });

  it('offers adaptive practice once the server reports it unlocked', async () => {
    mockedSelectSection.mockResolvedValue(
      contextWith({
        mode: 'adaptive',
        title: 'Adaptive Math Practice',
        description: 'Weakest areas.',
        is_locked: false,
        question_count: 5,
      })
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Start Adaptive Practice' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
  });

  it('routes to the domains drill-down', async () => {
    mockedSelectSection.mockResolvedValue(
      contextWith({
        mode: 'adaptive',
        title: 'Adaptive Math Practice',
        description: 'Weakest areas.',
        is_locked: true,
        question_count: 5,
        unlock_requirement: {
          required_sessions: 3,
          completed_sessions: 0,
          remaining_sessions: 3,
        },
      })
    );

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Browse 4 Domains/ }));

    expect(await screen.findByText('domains screen')).toBeInTheDocument();
  });

  it('routes to confirm when general practice is started', async () => {
    mockedSelectSection.mockResolvedValue(
      contextWith({
        mode: 'adaptive',
        title: 'Adaptive Math Practice',
        description: 'Weakest areas.',
        is_locked: false,
        question_count: 5,
      })
    );

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Start Practice' }));

    expect(await screen.findByText('confirm screen')).toBeInTheDocument();
  });

  it('redirects to the subject picker for an unknown section in the URL', async () => {
    renderPage('/practice/chemistry');

    expect(await screen.findByText('subject picker')).toBeInTheDocument();
    expect(mockedSelectSection).not.toHaveBeenCalled();
  });
});
