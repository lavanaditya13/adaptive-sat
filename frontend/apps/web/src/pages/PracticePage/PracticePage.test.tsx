import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PracticePage } from './PracticePage';
import { getCurrentQuestion, submitAnswer, completePractice } from '@/services/practice-service';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import { useResultsStore } from '@/store/results-store';
import { MOCK_QUESTIONS, MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';

vi.mock('@/services/practice-service', () => ({
  getCurrentQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  completePractice: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PracticePage />
    </MemoryRouter>
  );
}

describe('PracticePage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentQuestion).mockReset();
    vi.mocked(submitAnswer).mockReset();
    vi.mocked(completePractice).mockReset();
    navigateMock.mockReset();
    usePracticeSessionStore.getState().resetSession();
    useResultsStore.getState().clearResults();
  });

  it('shows the first question once the initial fetch resolves', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[0],
      current_position: 1,
      total_questions: 2,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('advances to the next question after answering, when questions remain', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({ question: MOCK_QUESTIONS[0], current_position: 1, total_questions: 2 })
      .mockResolvedValueOnce({ question: MOCK_QUESTIONS[1], current_position: 2, total_questions: 2 });
    vi.mocked(submitAnswer).mockResolvedValue({ saved: true, answered_position: 1, remaining_questions: 1 });
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await user.click(screen.getByText(MOCK_QUESTIONS[0].choices.A));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[1].prompt)).toBeInTheDocument();
    });
    expect(submitAnswer).toHaveBeenCalledWith('A', expect.any(Number), 3);
    expect(completePractice).not.toHaveBeenCalled();
  });

  it('completes the session and navigates to results after the last question', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[1],
      current_position: 2,
      total_questions: 2,
    });
    vi.mocked(submitAnswer).mockResolvedValue({ saved: true, answered_position: 2, remaining_questions: 0 });
    vi.mocked(completePractice).mockResolvedValue(MOCK_COMPLETE_RESPONSE);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[1].prompt)).toBeInTheDocument();
    });

    await user.click(screen.getByText(MOCK_QUESTIONS[1].choices.B));
    await user.click(screen.getByRole('button', { name: /finish test/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/results');
    });
    expect(completePractice).toHaveBeenCalledTimes(1);
    expect(useResultsStore.getState().latestResult).toEqual(MOCK_COMPLETE_RESPONSE);
  });

  it('shows an error message and stays on the question when saving an answer fails', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[0],
      current_position: 1,
      total_questions: 2,
    });
    vi.mocked(submitAnswer).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await user.click(screen.getByText(MOCK_QUESTIONS[0].choices.A));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to save answer. Please try again.')).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
