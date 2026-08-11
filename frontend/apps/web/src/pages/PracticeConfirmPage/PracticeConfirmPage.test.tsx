import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeConfirmPage } from './PracticeConfirmPage';
import { getSkillTree, type SkillTreeResponse } from '@/services/skill-tree-service';
import { startPractice } from '@/services/practice-service';
import { useAppShellStore } from '@/store/app-shell-store';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import type { StartPracticeResponse } from '@/types/api';

vi.mock('@/services/skill-tree-service', () => ({ getSkillTree: vi.fn() }));
vi.mock('@/services/practice-service', () => ({ startPractice: vi.fn() }));

const TREE: SkillTreeResponse = {
  section: 'math',
  sectionDisplayName: 'Math',
  masteryRule: { accuracy: 85, minQuestions: 10 },
  domains: [
    {
      name: 'Algebra',
      topicId: 2,
      topicCode: 'ALGEBRA',
      accuracy: 84,
      questionsAttempted: 25,
      questionsCorrect: 21,
      mastered: false,
      skills: [
        {
          name: 'Linear functions',
          accuracy: 90,
          questionsAttempted: 10,
          questionsCorrect: 9,
          mastered: true,
        },
      ],
    },
  ],
};

const START_RESPONSE: StartPracticeResponse = {
  status: 'in_progress',
  current_position: 1,
  total_questions: 5,
  question: {
    question_id: 11,
    prompt: 'If 3x + 7 = 22, what is x?',
    choices: { A: '3', B: '5', C: '7', D: '9' },
    section: 'math',
    topic_display_name: 'Algebra',
  },
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPage(search: string, state?: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: '/practice/math/confirm', search, state }]}
      >
        <LocationProbe />
        <Routes>
          <Route path="/practice/:subject/confirm" element={<PracticeConfirmPage />} />
          <Route path="*" element={<p>fallback</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeConfirmPage', () => {
  beforeEach(() => {
    vi.mocked(getSkillTree).mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(TREE);
    vi.mocked(startPractice).mockReset();
    vi.mocked(startPractice).mockResolvedValue(START_RESPONSE);
    useAppShellStore.setState({ trailingCrumbLabel: null, toastMessage: null });
    usePracticeSessionStore.getState().resetSession();
  });

  it('summarises a skill target and names it in the breadcrumb', async () => {
    renderPage('?scope=skill&domain=Algebra&skill=Linear+functions');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Linear functions' })).toBeInTheDocument()
    );

    expect(screen.getByText('Math · Algebra')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText(/crushing it/i)).toBeInTheDocument();
    expect(useAppShellStore.getState().trailingCrumbLabel).toBe('Linear functions');
  });

  it('starts a topic-scoped session and hands the first question to the runner', async () => {
    const user = userEvent.setup();
    renderPage('?scope=skill&domain=Algebra&skill=Linear+functions');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Linear functions' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    await waitFor(() =>
      expect(startPractice).toHaveBeenCalledWith({ mode: 'topic', topic_id: 2 })
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/session');
    expect(usePracticeSessionStore.getState().currentQuestion?.question_id).toBe(11);
  });

  it('starts a whole-section session for general practice', async () => {
    const user = userEvent.setup();
    renderPage('?scope=general');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /general practice/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    await waitFor(() => expect(startPractice).toHaveBeenCalledWith({ mode: 'section' }));
  });

  it('accepts a practice-entry hand-off passed as router location state', async () => {
    const user = userEvent.setup();
    renderPage('', {
      mode: 'adaptive',
      sectionId: 1,
      subject: 'math',
      title: 'Adaptive Practice',
      questionCount: 8,
    });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Adaptive Practice' })).toBeInTheDocument()
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(useAppShellStore.getState().trailingCrumbLabel).toBe('Adaptive Practice');

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    await waitFor(() => expect(startPractice).toHaveBeenCalledWith({ mode: 'adaptive' }));
  });

  it('redirects to the domain list when the target is no longer in the tree', async () => {
    renderPage('?scope=domain&domain=Trigonometry');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/practice/math/domains')
    );
    expect(startPractice).not.toHaveBeenCalled();
  });

  it('surfaces a start failure as a toast instead of navigating', async () => {
    vi.mocked(startPractice).mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderPage('?scope=domain&domain=Algebra');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    await waitFor(() =>
      expect(useAppShellStore.getState().toastMessage).toMatch(/unexpected error/i)
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/math/confirm');
  });
});
