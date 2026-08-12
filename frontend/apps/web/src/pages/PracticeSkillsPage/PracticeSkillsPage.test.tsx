import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSkillsPage } from './PracticeSkillsPage';
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
      skills: [
        {
          name: 'Linear equations in one variable',
          accuracy: 90,
          questionsAttempted: 12,
          questionsCorrect: 11,
          mastered: true,
        },
        {
          name: 'Systems of linear equations',
          accuracy: 0,
          questionsAttempted: 0,
          questionsCorrect: 0,
          mastered: false,
        },
      ],
    },
  ],
};

function renderPage(path = '/practice/math/domains/Algebra') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/practice/:subject/domains/:domain" element={<PracticeSkillsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeSkillsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(MATH_TREE);
    vi.mocked(startPractice).mockReset();
  });

  it('renders the domain header and every skill row', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Algebra')).toBeInTheDocument();
    });

    expect(screen.getByText('Linear equations in one variable')).toBeInTheDocument();
    expect(screen.getByText('Systems of linear equations')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('starting a skill row starts the parent domain topic, not the skill alone', async () => {
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

    await waitFor(() => screen.getAllByText('Start'));
    await user.click(screen.getAllByText('Start')[0]);

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith({ mode: 'topic', topic_id: 1 });
    });
    expect(navigateMock).toHaveBeenCalledWith('/practice/session');
  });

  it('shows a not-found state for a domain that is not in the skill tree', async () => {
    renderPage('/practice/math/domains/Unknown');

    await waitFor(() => {
      expect(screen.getByText('Domain not found')).toBeInTheDocument();
    });
  });
});
