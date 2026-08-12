import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsPage } from './ResultsPage';
import { useResultsStore } from '@/store/results-store';
import { getLatestResult } from '@/services/practice-service';
import { MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';
import { queryKeys } from '@/constants/query-keys';
import {
  BACK_TO_DASHBOARD_BUTTON,
  TRY_AGAIN_BUTTON,
  RETRY_BUTTON,
  ERROR_TITLE,
  LOADING_LABEL,
} from './ResultsPage.constants';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/practice-service', () => ({
  getLatestResult: vi.fn(),
}));

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

  return { invalidateQueriesSpy, queryClient };
}

/** Renders and waits out the initial fetch, for the cases that assert on
 *  post-fetch content rather than on the loading state itself. */
async function renderSettledResultsPage() {
  const rendered = renderResultsPage();
  await waitFor(() => expect(getLatestResult).toHaveBeenCalled());
  return rendered;
}

describe('ResultsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useResultsStore.getState().clearResults();
    vi.mocked(getLatestResult).mockReset();
    vi.mocked(getLatestResult).mockResolvedValue(null);
  });

  it('fetches the latest result on mount when the store is empty (a direct visit to the Results tab)', async () => {
    vi.mocked(getLatestResult).mockResolvedValue(MOCK_COMPLETE_RESPONSE);

    renderResultsPage();

    expect(await screen.findByText(/2\/3/)).toBeInTheDocument();
    expect(getLatestResult).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of the empty state while that fetch is in flight', async () => {
    let resolveFetch: (value: typeof MOCK_COMPLETE_RESPONSE) => void = () => {};
    vi.mocked(getLatestResult).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderResultsPage();

    // The bug this guards: rendering "No Recent Results" before the answer
    // is back tells the student they have never practised.
    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();
    expect(screen.getByLabelText(LOADING_LABEL)).toBeInTheDocument();

    resolveFetch(MOCK_COMPLETE_RESPONSE);
    expect(await screen.findByText(/2\/3/)).toBeInTheDocument();
  });

  it('shows the empty state only once the server confirms there is no completed session', async () => {
    const user = userEvent.setup();
    vi.mocked(getLatestResult).mockResolvedValue(null);

    await renderSettledResultsPage();

    expect(await screen.findByText('No Recent Results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('distinguishes a failed fetch from "no results", and retries on demand', async () => {
    const user = userEvent.setup();
    vi.mocked(getLatestResult).mockRejectedValueOnce(new Error('network down'));

    await renderSettledResultsPage();

    expect(await screen.findByText(ERROR_TITLE)).toBeInTheDocument();
    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();

    vi.mocked(getLatestResult).mockResolvedValue(MOCK_COMPLETE_RESPONSE);
    await user.click(screen.getByRole('button', { name: RETRY_BUTTON }));

    expect(await screen.findByText(/2\/3/)).toBeInTheDocument();
  });

  it('renders the just-completed result from the store without waiting on the network', () => {
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    renderResultsPage();

    // Synchronous — no findBy, no awaited fetch.
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.queryByLabelText(LOADING_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();
  });

  it('renders the score summary and question breakdown for a saved result', async () => {
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    await renderSettledResultsPage();

    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText('If 3x + 7 = 22, what is the value of 6x - 4?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: TRY_AGAIN_BUTTON })).toBeInTheDocument();
  });

  it('invalidates the dashboard query cache when clicking "Back to Dashboard"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = await renderSettledResultsPage();

    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidates the dashboard query cache and routes to the subject\'s practice flow when clicking "Try Again"', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    const { invalidateQueriesSpy } = await renderSettledResultsPage();

    await user.click(screen.getByRole('button', { name: TRY_AGAIN_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    expect(navigateMock).toHaveBeenCalledWith('/practice/math');
  });

  it('routes "Try Again" by the section of a result that came from the server, not just the store', async () => {
    const user = userEvent.setup();
    vi.mocked(getLatestResult).mockResolvedValue({
      ...MOCK_COMPLETE_RESPONSE,
      section: 'reading_writing',
    });

    renderResultsPage();

    await user.click(await screen.findByRole('button', { name: TRY_AGAIN_BUTTON }));

    expect(navigateMock).toHaveBeenCalledWith('/practice/reading_writing');
  });

  it('invalidates the dashboard query cache from the empty state too (e.g. a direct visit with no completed session)', async () => {
    const user = userEvent.setup();

    const { invalidateQueriesSpy } = await renderSettledResultsPage();

    await user.click(await screen.findByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('toggles a question breakdown row open and closed, revealing its explanation', async () => {
    const user = userEvent.setup();
    useResultsStore.getState().setLatestResult(MOCK_COMPLETE_RESPONSE);

    await renderSettledResultsPage();

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

  it('renders an em dash instead of a fake 0 or 3 when average_confidence is null', async () => {
    useResultsStore
      .getState()
      .setLatestResult({ ...MOCK_COMPLETE_RESPONSE, average_confidence: null });

    await renderSettledResultsPage();

    const label = screen.getByText('Avg confidence');
    expect(label.previousSibling).toHaveTextContent('—');
  });
});
