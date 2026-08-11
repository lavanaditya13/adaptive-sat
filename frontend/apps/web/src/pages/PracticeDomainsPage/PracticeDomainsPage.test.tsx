import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeDomainsPage } from './PracticeDomainsPage';
import { getSkillTree } from '@/services/skill-tree-service';
import { startPractice } from '@/services/practice-service';
import type { SkillTreeResponse } from '@/types/api';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/skill-tree-service', () => ({
  getSkillTree: vi.fn(),
}));

vi.mock('@/services/practice-service', () => ({
  startPractice: vi.fn(),
}));

const MATH_TREE: SkillTreeResponse = {
  section: 'math',
  sectionDisplayName: 'Math',
  masteryRule: { accuracy: 85, minQuestions: 10 },
  domains: [
    {
      name: 'Algebra',
      topicId: 1,
      topicCode: 'ALGEBRA',
      accuracy: 85,
      questionsAttempted: 38,
      questionsCorrect: 32,
      mastered: false,
      skills: [],
    },
    {
      name: 'Geometry and Trigonometry',
      topicId: 4,
      topicCode: 'GEOMETRY',
      accuracy: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      mastered: false,
      skills: [],
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/math/domains']}>
        <Routes>
          <Route path="/practice/:subject/domains" element={<PracticeDomainsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeDomainsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(MATH_TREE);
    vi.mocked(startPractice).mockReset();
  });

  it('renders every domain with its accuracy, and marks an unattempted domain as not started', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Algebra')).toBeInTheDocument();
    });

    expect(screen.getByText('Geometry and Trigonometry')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('starts that domain\'s topic session using its topicId', async () => {
    vi.mocked(startPractice).mockResolvedValue({
      status: 'in_progress',
      current_position: 1,
      total_questions: 10,
      question: {
        question_id: 1,
        prompt: 'q',
        choices: { A: 'a', B: 'b', C: 'c', D: 'd' },
        section: 'math',
        topic_display_name: 'Algebra',
      },
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getAllByText('Start domain test'));
    await user.click(screen.getAllByText('Start domain test')[0]);

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith({ mode: 'topic', topic_id: 1 });
    });
    expect(navigateMock).toHaveBeenCalledWith('/practice/session');
  });

  it('navigates to the skills drilldown for a domain', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getAllByText('View skills'));
    await user.click(screen.getAllByText('View skills')[0]);

    expect(navigateMock).toHaveBeenCalledWith('/practice/math/domains/Algebra');
  });

  it('starts an overall practice test across the whole subject', async () => {
    vi.mocked(startPractice).mockResolvedValue({
      status: 'in_progress',
      current_position: 1,
      total_questions: 10,
      question: {
        question_id: 1,
        prompt: 'q',
        choices: { A: 'a', B: 'b', C: 'c', D: 'd' },
        section: 'math',
        topic_display_name: 'Algebra',
      },
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Start overall test'));
    await user.click(screen.getByText('Start overall test'));

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith({ mode: 'section' });
    });
    expect(navigateMock).toHaveBeenCalledWith('/practice/session');
  });
});
