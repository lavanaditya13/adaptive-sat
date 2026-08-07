import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsPage } from './ResultsPage';
import { useResultsStore } from '@/store/results-store';
import { queryKeys } from '@/constants/query-keys';
import { BACK_TO_DASHBOARD_BUTTON, START_NEW_PRACTICE_BUTTON } from './ResultsPage.constants';
import type { CompleteResponse } from '@/types/api';

const MOCK_COMPLETE_RESPONSE: CompleteResponse = {
  status: 'completed',
  score: { correct: 4, incorrect: 1, total: 5, percentage: 80 },
  average_confidence: 4,
  question_breakdown: [],
  section: 'math',
  section_display_name: 'Math',
};

function renderResultsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { invalidateQueriesSpy };
}

describe('ResultsPage', () => {
  beforeEach(() => {
    useResultsStore.getState().clearResults();
  });

  it('invalidates the dashboard query cache when clicking "Back to Dashboard"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidates the dashboard query cache when clicking "Practice Again"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: START_NEW_PRACTICE_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidates the dashboard query cache from the empty state too (e.g. a direct visit with no session in this browser tab)', async () => {
    const user = userEvent.setup();

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});
