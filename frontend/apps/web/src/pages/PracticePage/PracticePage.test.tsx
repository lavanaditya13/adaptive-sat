import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticePage } from './PracticePage';
import { getCurrentQuestion, submitAnswer, completePractice } from '@/services/practice-service';
import { usePracticeSessionStore } from '@/store/practice-session-store';
import { useResultsStore } from '@/store/results-store';
import { MOCK_QUESTIONS, MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';
import { queryKeys } from '@/constants/query-keys';
import { FINISH_TEST_LABEL } from './PracticePage.constants';
import type { Question } from '@/types/api';

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

// Own choices ('3'/'4'/'5'/'6') deliberately collide with the ConfidenceSelector's
// bare "4" button, exercising the disambiguation-by-button lookup in the last test.
const MOCK_QUESTION: Question = {
  question_id: 1,
  prompt: 'What is 2 + 2?',
  choices: { A: '3', B: '4', C: '5', D: '6' },
  section: 'math',
  topic_display_name: 'Arithmetic',
};

function renderPracticePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PracticePage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { invalidateQueriesSpy };
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

    renderPracticePage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('advances to the next question after answering, when questions remain', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({ question: MOCK_QUESTIONS[0], current_position: 1, total_questions: 2 })
      .mockResolvedValueOnce({ question: MOCK_QUESTIONS[1], current_position: 2, total_questions: 2 });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 1,
      attempt_id: 1,
    });
    const user = userEvent.setup();

    renderPracticePage();

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
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 2,
      remaining_questions: 0,
      attempt_id: 2,
    });
    vi.mocked(completePractice).mockResolvedValue(MOCK_COMPLETE_RESPONSE);
    const user = userEvent.setup();

    renderPracticePage();

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

    renderPracticePage();

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

  it('invalidates the dashboard query cache once the session completes', async () => {
    const user = userEvent.setup();

    // Not asserted on: PracticePage isn't wrapped in a <Routes> switch here,
    // so navigate(ROUTES.RESULTS) doesn't unmount it like it would in the
    // real app, and its "load next question" effect can still fire once
    // resetSession() nulls currentQuestion after completion.
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      current_position: 1,
      total_questions: 1,
      question: MOCK_QUESTION,
    });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 0,
      attempt_id: 1,
    });
    vi.mocked(completePractice).mockResolvedValue(MOCK_COMPLETE_RESPONSE);

    // Seed the (real) practice-session store as if the student is on the
    // last question of a 1-question session, so submitting immediately
    // triggers the completion branch under test.
    usePracticeSessionStore.getState().setSessionData(MOCK_QUESTION, 1, 1);

    const { invalidateQueriesSpy } = renderPracticePage();

    // Choice "B" — found via its badge letter, since the ConfidenceSelector
    // below also renders a bare "4" button (confidence level 4) that
    // collides with a plain text lookup on the choice text "4".
    const choiceB = screen.getByText('B').closest('button');
    expect(choiceB).not.toBeNull();
    await user.click(choiceB!);
    await user.click(screen.getByRole('button', { name: FINISH_TEST_LABEL }));

    await waitFor(() => {
      expect(completePractice).toHaveBeenCalled();
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});
