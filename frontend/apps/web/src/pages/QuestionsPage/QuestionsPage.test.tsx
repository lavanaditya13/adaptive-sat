import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuestionsPage } from './QuestionsPage';
import {
  abandonPractice,
  completePractice,
  getCurrentQuestion,
  submitAnswer,
} from '@/services/practice-service';
import { useAppShellStore } from '@/store/app-shell-store';
import { useResultsStore } from '@/store/results-store';
import { MOCK_COMPLETE_RESPONSE, MOCK_QUESTIONS } from '@/mocks/mock-data';
import { queryKeys } from '@/constants/query-keys';
import { FINISH_TEST_LABEL, SKIP_LABEL } from '@/components/practice/SessionNavigation/SessionNavigation.constants';
import {
  LIVE_TIMER_LABEL,
  OPEN_NAV_LABEL,
  SESSION_TIMER_LABEL,
} from '@/components/practice/SessionHeader/SessionHeader.constants';

vi.mock('@/services/practice-service', () => ({
  getCurrentQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  completePractice: vi.fn(),
  abandonPractice: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderQuestionsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { invalidateQueriesSpy, queryClient };
}

/** Choice text can collide with the confidence buttons' bare numerals, so
 *  options are always located through their A–D badge. */
function clickOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  const option = screen.getByText(label).closest('button');
  expect(option).not.toBeNull();
  return user.click(option!);
}

describe('QuestionsPage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentQuestion).mockReset();
    vi.mocked(submitAnswer).mockReset();
    vi.mocked(completePractice).mockReset();
    vi.mocked(abandonPractice).mockReset();
    navigateMock.mockReset();
    useResultsStore.getState().clearResults();
    useAppShellStore.getState().setTrailingCrumbLabel(null);
  });

  it('renders the resumed question, counter and live timer', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[0],
      current_position: 1,
      total_questions: 3,
    });

    renderQuestionsPage();

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    // Both clocks tick on a real 1s interval, so assert the M:SS shape rather
    // than a literal 0:00 that a slow run has already ticked past.
    expect(screen.getByLabelText(SESSION_TIMER_LABEL)).toHaveTextContent(/^\d+:[0-5]\d total$/);
    expect(screen.getByLabelText(LIVE_TIMER_LABEL)).toHaveTextContent(/^\d+:[0-5]\d$/);
    // The breadcrumb can't derive the topic from the URL, so the page sets
    // it from an effect keyed on the question. That effect belongs to the
    // same render as the prompt text above, but isn't guaranteed to have
    // flushed at the exact instant the prior `waitFor` resolves -- assert it
    // through its own `waitFor` rather than a synchronous read to avoid a
    // timing-dependent flake (was previously a bare `expect`, intermittently
    // flaky in CI).
    await waitFor(() => {
      expect(useAppShellStore.getState().trailingCrumbLabel).toBe(
        MOCK_QUESTIONS[0].topic_display_name
      );
    });
  });

  it('submits the selected answer with its confidence rating and advances', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[0],
        current_position: 1,
        total_questions: 3,
      })
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[1],
        current_position: 2,
        total_questions: 3,
      });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 2,
      attempt_id: 501,
    });
    const user = userEvent.setup();

    renderQuestionsPage();
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await clickOption(user, 'B');
    await user.click(screen.getByRole('button', { name: 'Confidence 5' }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[1].prompt)).toBeInTheDocument();
    });
    expect(submitAnswer).toHaveBeenCalledWith('B', expect.any(Number), 5);
    expect(completePractice).not.toHaveBeenCalled();
  });

  it('defaults confidence to 3 and records a skip as a null answer', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[0],
        current_position: 1,
        total_questions: 3,
      })
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[1],
        current_position: 2,
        total_questions: 3,
      });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 2,
      attempt_id: 502,
    });
    const user = userEvent.setup();

    renderQuestionsPage();
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: SKIP_LABEL }));

    await waitFor(() => {
      expect(submitAnswer).toHaveBeenCalledWith(null, expect.any(Number), 3);
    });
  });

  it('jumps back to a submitted question in read-only review mode', async () => {
    vi.mocked(getCurrentQuestion)
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[0],
        current_position: 1,
        total_questions: 3,
      })
      .mockResolvedValueOnce({
        question: MOCK_QUESTIONS[1],
        current_position: 2,
        total_questions: 3,
      });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 2,
      attempt_id: 503,
    });
    const user = userEvent.setup();

    renderQuestionsPage();
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await clickOption(user, 'A');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[1].prompt)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: OPEN_NAV_LABEL }));
    await user.click(screen.getByRole('button', { name: '1' }));

    // Back on question 1, locked, with the review banner shown.
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });
    expect(screen.getByText(/reviewing a past question/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
  });

  it('completes the session, stores and caches the result, and routes to results', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[0],
      current_position: 1,
      total_questions: 1,
    });
    vi.mocked(submitAnswer).mockResolvedValue({
      saved: true,
      answered_position: 1,
      remaining_questions: 0,
      attempt_id: 504,
    });
    vi.mocked(completePractice).mockResolvedValue(MOCK_COMPLETE_RESPONSE);
    const user = userEvent.setup();

    const { invalidateQueriesSpy, queryClient } = renderQuestionsPage();
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await clickOption(user, 'C');
    await user.click(screen.getByRole('button', { name: FINISH_TEST_LABEL }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/results');
    });
    expect(completePractice).toHaveBeenCalledTimes(1);
    expect(useResultsStore.getState().latestResult).toEqual(MOCK_COMPLETE_RESPONSE);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    // The session just finished IS the latest result, so the Results tab's
    // cache is seeded here rather than left to refetch what we already have.
    expect(queryClient.getQueryData(queryKeys.practice.latestResult)).toEqual(
      MOCK_COMPLETE_RESPONSE
    );
  });

  it('surfaces a save failure and stays on the question', async () => {
    vi.mocked(getCurrentQuestion).mockResolvedValue({
      question: MOCK_QUESTIONS[0],
      current_position: 1,
      total_questions: 3,
    });
    vi.mocked(submitAnswer).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    renderQuestionsPage();
    await waitFor(() => {
      expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
    });

    await clickOption(user, 'A');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save answer.');
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText(MOCK_QUESTIONS[0].prompt)).toBeInTheDocument();
  });

  it('keeps the student on a session that fails to load for a transient reason', async () => {
    vi.mocked(getCurrentQuestion).mockRejectedValue(new Error('offline'));

    renderQuestionsPage();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load your session/i)).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
