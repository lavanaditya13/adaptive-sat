import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResultsPage } from './ResultsPage';
import { useResultsStore } from '@/store/results-store';
import { MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';

vi.mock('@/store/results-store', () => ({
  useResultsStore: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ResultsPage />
    </MemoryRouter>
  );
}

describe('ResultsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useResultsStore).mockReset();
  });

  it('shows an empty state with a link back to the dashboard when there is no saved result', async () => {
    vi.mocked(useResultsStore).mockImplementation((selector) =>
      selector({ latestResult: null, setLatestResult: vi.fn(), clearResults: vi.fn() })
    );
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByText('No Recent Results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the score summary and question breakdown for a saved result', () => {
    vi.mocked(useResultsStore).mockImplementation((selector) =>
      selector({ latestResult: MOCK_COMPLETE_RESPONSE, setLatestResult: vi.fn(), clearResults: vi.fn() })
    );

    renderPage();

    expect(screen.queryByText('No Recent Results')).not.toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(
      screen.getByText('If 3x + 7 = 22, what is the value of 6x - 4?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /practice again/i })).toBeInTheDocument();
  });
});
