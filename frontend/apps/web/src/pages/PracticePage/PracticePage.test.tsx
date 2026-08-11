import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticePage } from './PracticePage';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import {
  getCurrentQuestion,
  getSessionNavigation,
  submitAnswer,
  completePractice,
} from '@/services/practice-service';
import { PREVIOUS_LABEL, SKIP_LABEL, NEXT_LABEL } from './PracticePage.constants';

vi.mock('@/services/practice-service');

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const TOTAL = 3;

function questionAt(position: number) {
  return {
    question_id: position,
    prompt: `Prompt ${position}`,
    choices: { A: 'Choice A', B: 'Choice B' },
    section: 'math',
    topic_display_name: 'Algebra',
  };
}

function questionResponse(position: number, answered = false) {
  return {
    current_position: position,
    total_questions: TOTAL,
    question: questionAt(position),
    is_answered: answered,
    selected_answer: answered ? 'A' : null,
    confidence_level: answered ? 4 : null,
  };
}

function navigationResponse(answeredPositions: number[]) {
  return {
    status: 'in_progress',
    total_questions: TOTAL,
    answered_count: answeredPositions.length,
    remaining_count: TOTAL - answeredPositions.length,
    next_unanswered_position:
      [1, 2, 3].find((p) => !answeredPositions.includes(p)) ?? null,
    questions: [1, 2, 3].map((position) => ({
      position,
      status: answeredPositions.includes(position) ? 'answered' : 'assigned',
    })),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PracticePage />
    </MemoryRouter>
  );
}

describe('PracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePracticeSessionStore.getState().resetSession();

    vi.mocked(getCurrentQuestion).mockImplementation(async (position?: number) =>
      questionResponse(position ?? 1)
    );
    vi.mocked(getSessionNavigation).mockResolvedValue(navigationResponse([]));
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 2,
      is_update: false,
    });
    vi.mocked(completePractice).mockResolvedValue({} as never);
  });

  it('renders the first question of the session', async () => {
    renderPage();

    expect(await screen.findByText('Prompt 1')).toBeInTheDocument();
    expect(screen.getByText(/Question\s*1/)).toBeInTheDocument();
  });

  it('skips forward without submitting an answer', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Prompt 1');

    await user.click(screen.getByRole('button', { name: SKIP_LABEL }));

    await waitFor(() => expect(screen.getByText('Prompt 2')).toBeInTheDocument());
    // The whole point of skipping: nothing is recorded for the question we left.
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(getCurrentQuestion).toHaveBeenCalledWith(2);
  });

  it('navigates back to a previous question', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Prompt 1');

    await user.click(screen.getByRole('button', { name: SKIP_LABEL }));
    await waitFor(() => expect(screen.getByText('Prompt 2')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: PREVIOUS_LABEL }));

    await waitFor(() => expect(screen.getByText('Prompt 1')).toBeInTheDocument());
    expect(getCurrentQuestion).toHaveBeenLastCalledWith(1);
  });

  it('disables Previous on the first question', async () => {
    renderPage();
    await screen.findByText('Prompt 1');

    expect(screen.getByRole('button', { name: PREVIOUS_LABEL })).toBeDisabled();
  });

  it('submits the answer against the position on screen, not the session pointer', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Prompt 1');

    // Skip to question 2, so the earliest unanswered question (1) is no longer
    // the one being answered. Sending the position is what keeps these apart.
    await user.click(screen.getByRole('button', { name: SKIP_LABEL }));
    await waitFor(() => expect(screen.getByText('Prompt 2')).toBeInTheDocument());

    await user.click(screen.getByText('Choice A'));
    await user.click(screen.getByRole('button', { name: /Save Answer/ }));

    await waitFor(() => expect(submitAnswer).toHaveBeenCalled());
    expect(vi.mocked(submitAnswer).mock.calls[0][3]).toBe(2);
  });

  it('restores a previous selection when returning to an answered question', async () => {
    // The initial load passes no position, so resolve it before deciding
    // whether this position counts as already answered.
    vi.mocked(getCurrentQuestion).mockImplementation(async (position?: number) => {
      const resolved = position ?? 1;
      return questionResponse(resolved, resolved === 1);
    });

    renderPage();
    await screen.findByText('Prompt 1');

    await waitFor(() =>
      expect(usePracticeSessionStore.getState().selectedAnswer).toBe('A')
    );
    expect(usePracticeSessionStore.getState().confidenceLevel).toBe(4);
    // An answered question offers plain forward navigation rather than a skip.
    expect(screen.getByRole('button', { name: NEXT_LABEL })).toBeInTheDocument();
  });

  it('only offers Finish once nothing is left unanswered', async () => {
    vi.mocked(getSessionNavigation).mockResolvedValue(navigationResponse([1, 2, 3]));

    renderPage();
    await screen.findByText('Prompt 1');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Finish Test/ })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /Save Answer/ })).not.toBeInTheDocument();
  });
});
