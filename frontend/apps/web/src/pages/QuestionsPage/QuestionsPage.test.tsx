import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QuestionsPage } from './QuestionsPage';
import {
  completePractice,
  getCurrentQuestion,
  submitAnswer,
  updateAttempt,
} from '@/services/practice-service';
import { useResultsStore } from '@/store/results-store';
import type { Question } from '@/types/api';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/practice-service', () => ({
  getCurrentQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  updateAttempt: vi.fn(),
  completePractice: vi.fn(),
}));

function buildQuestion(id: number): Question {
  return {
    question_id: id,
    prompt: `Question ${id} prompt`,
    choices: { A: 'first', B: 'second', C: 'third', D: 'fourth' },
    section: 'math',
    topic_display_name: 'Algebra',
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <QuestionsPage />
    </MemoryRouter>
  );
}

describe('QuestionsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(getCurrentQuestion).mockReset();
    vi.mocked(submitAnswer).mockReset();
    vi.mocked(updateAttempt).mockReset();
    vi.mocked(completePractice).mockReset();
    useResultsStore.setState({ latestResult: null });

    vi.mocked(getCurrentQuestion).mockResolvedValue({
      current_position: 1,
      total_questions: 3,
      question: buildQuestion(1),
    });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 2,
      attempt_id: 55,
    });
  });

  it('renders the served question with its topic, prompt and choices', async () => {
    renderPage();

    expect(await screen.findByText('Question 1 prompt')).toBeInTheDocument();
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('Q 1')).toBeInTheDocument();
  });

  it('will not advance until an answer is chosen', async () => {
    renderPage();
    await screen.findByText('Question 1 prompt');

    expect(screen.getByRole('button', { name: /next question/i })).toBeDisabled();
  });

  it('submits the answer with its confidence, then moves on', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        current_position: 1,
        total_questions: 3,
        question: buildQuestion(1),
      })
      .mockResolvedValueOnce({
        current_position: 2,
        total_questions: 3,
        question: buildQuestion(2),
      });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Question 1 prompt');
    await user.click(screen.getByText('second'));
    await user.click(screen.getByRole('button', { name: /^5$/ }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(submitAnswer).toHaveBeenCalledWith('B', expect.any(Number), 5);
    });
    expect(await screen.findByText('Question 2 prompt')).toBeInTheDocument();
  });

  it('skips without answering so the question can be returned to later', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        current_position: 1,
        total_questions: 3,
        question: buildQuestion(1),
      })
      .mockResolvedValueOnce({
        current_position: 2,
        total_questions: 3,
        question: buildQuestion(2),
      });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Question 1 prompt');
    await user.click(screen.getByRole('button', { name: /skip/i }));

    await waitFor(() => expect(screen.getByText('Question 2 prompt')).toBeInTheDocument());
    // Skipping must not create an attempt, otherwise the slot locks server-side.
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('serves an already-answered question from cache and updates the attempt when changed', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        current_position: 1,
        total_questions: 3,
        question: buildQuestion(1),
      })
      .mockResolvedValueOnce({
        current_position: 2,
        total_questions: 3,
        question: buildQuestion(2),
      });
    vi.mocked(updateAttempt).mockResolvedValue({ saved: true, attempt_id: 55 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Question 1 prompt');
    await user.click(screen.getByText('second'));
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await screen.findByText('Question 2 prompt');

    // Back to the answered question — rendered from cache, no refetch (the backend
    // 400s on an answered position), and flagged as a review.
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(await screen.findByText('Question 1 prompt')).toBeInTheDocument();
    expect(screen.getByText(/reviewing a past question/i)).toBeInTheDocument();

    await user.click(screen.getByText('third'));
    expect(screen.getByText(/changed from your original answer/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await waitFor(() => expect(updateAttempt).toHaveBeenCalledWith(55, 'C'));
  });

  it('completes the session from the last question and hands the result to results', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      current_position: 2,
      total_questions: 2,
      question: buildQuestion(2),
    });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 2,
      remaining_questions: 0,
      attempt_id: 77,
    });
    vi.mocked(completePractice).mockResolvedValue({
      status: 'completed',
      score: { correct: 1, incorrect: 1, total: 2, percentage: 50 },
      average_confidence: 3.5,
      question_breakdown: [],
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Question 2 prompt');
    await user.click(screen.getByText('first'));
    await user.click(screen.getByRole('button', { name: /finish test/i }));

    await waitFor(() => expect(completePractice).toHaveBeenCalled());
    expect(useResultsStore.getState().latestResult?.score.total).toBe(2);
    expect(navigateMock).toHaveBeenCalledWith('/results');
  });
});
