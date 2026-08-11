import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsPage } from './ResultsPage';
import { useResultsStore } from '@/store/results-store';
import { MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';
import { queryKeys } from '@/constants/query-keys';
import { BACK_TO_DASHBOARD_BUTTON, TRY_AGAIN_BUTTON } from './ResultsPage.constants';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

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
    navigateMock.mockReset();
    useResultsStore.getState().clearResults();
  });

  it('shows an empty state with a link back to the dashboard when there is no saved result', async () => {
    const user = userEvent.setup();

    renderResultsPage();

    expect(screen.getByText('No Recent Results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the score summary and question breakdown for a saved result', () => {
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    renderResultsPage();

    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(
      screen.getByText('If 3x + 7 = 22, what is the value of 6x - 4?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('invalidates the dashboard query cache when clicking "Back to Dashboard"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidates the dashboard query cache and routes to the subject\'s practice flow when clicking "Try Again"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: TRY_AGAIN_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    expect(navigateMock).toHaveBeenCalledWith('/practice/math');
  });

  it('invalidates the dashboard query cache from the empty state too (e.g. a direct visit with no session in this browser tab)', async () => {
    const user = userEvent.setup();

    const { invalidateQueriesSpy } = renderResultsPage();

    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('toggles a question breakdown row open and closed, revealing its explanation', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    renderResultsPage();

    const explanation =
      'Parallel lines share the same slope. Since the original line has a slope of 4, the parallel line must also have a slope of 4 — only option B matches.';
    expect(screen.queryByText(explanation)).not.toBeInTheDocument();

    const row = screen.getByText(
      'Which of the following equations represents a line parallel to y = 4x - 5?'
    );
    await user.click(row.closest('button')!);
    expect(screen.getByText(explanation)).toBeInTheDocument();

    // Clicking the already-open row closes it again.
    await user.click(row.closest('button')!);
    expect(screen.queryByText(explanation)).not.toBeInTheDocument();
  });

  it('renders an em dash instead of a fake 0 or 3 when average_confidence is null', () => {
    useResultsStore
      .getState()
      .setLatestResult({ ...MOCK_COMPLETE_RESPONSE, average_confidence: null });

    renderResultsPage();

    const label = screen.getByText('Avg confidence');
    expect(label.previousSibling).toHaveTextContent('—');
  });
});
