import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeHomePage } from './PracticeHomePage';
import { getSkillTree } from '@/services/skill-tree-service';
import { startPractice } from '@/services/practice-service';
import { useAppShellStore } from '@/store/app-shell-store';
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
      name: 'Advanced Math',
      topicId: 2,
      topicCode: 'ADVANCED_MATH',
      accuracy: 78,
      questionsAttempted: 32,
      questionsCorrect: 25,
      mastered: false,
      skills: [],
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/math']}>
        <Routes>
          <Route path="/practice/:subject" element={<PracticeHomePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeHomePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(MATH_TREE);
    vi.mocked(startPractice).mockReset();
    useAppShellStore.setState({ toastMessage: null });
  });

  it('renders subject header stats and both practice mode cards', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2 domains · 70 questions done')).toBeInTheDocument();
    });

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('General Practice')).toBeInTheDocument();
    expect(screen.getByText('Practice by Topic')).toBeInTheDocument();
  });

  it('starts a section-wide session and navigates to it on success', async () => {
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

    await waitFor(() => screen.getByText('Start Practice'));
    await user.click(screen.getByText('Start Practice'));

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith({ mode: 'section' });
    });
    expect(navigateMock).toHaveBeenCalledWith('/practice/session');
  });

  it('navigates to the domains list from the "Practice by Topic" card', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText(/Browse 2 Domains/));
    await user.click(screen.getByText(/Browse 2 Domains/).closest('button')!);

    expect(navigateMock).toHaveBeenCalledWith('/practice/math/domains');
  });

  it('shows a toast instead of navigating when starting practice fails', async () => {
    vi.mocked(startPractice).mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Start Practice'));
    await user.click(screen.getByText('Start Practice'));

    await waitFor(() => {
      expect(useAppShellStore.getState().toastMessage).toBeTruthy();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
