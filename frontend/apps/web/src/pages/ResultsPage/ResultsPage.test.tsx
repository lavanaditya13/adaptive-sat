import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResultsPage } from './ResultsPage';
import { useResultsStore } from '@/store/results-store';
import { ROUTES } from '@/constants/routes';
import type { CompleteResponse } from '@/types/api';
import {
  EMPTY_TITLE,
  BACK_TO_DASHBOARD_BUTTON,
  START_NEW_PRACTICE_BUTTON,
} from './ResultsPage.constants';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const RESULT: CompleteResponse = {
  status: 'completed',
  score: { correct: 8, incorrect: 2, total: 10, percentage: 80 },
  average_confidence: 3.5,
  question_breakdown: [
    {
      question_id: 1,
      topic_display_name: 'Linear Equations',
      prompt: 'Solve for x in 2x + 4 = 10',
      choices: { A: '1', B: '2', C: '3', D: '4' },
      correct_answer: 'C',
      selected_answer: 'C',
      is_correct: true,
      confidence_level: 4,
      explanation: 'Subtract 4, then divide by 2.',
    },
  ],
  section: 'math',
  section_display_name: 'Math',
};

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
    useResultsStore.getState().clearResults();
  });

  it('shows the empty state when there is no stored result', () => {
    renderPage();

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON })).toBeInTheDocument();
  });

  it('renders the score summary and question breakdown for the latest result', () => {
    useResultsStore.getState().setLatestResult(RESULT);

    renderPage();

    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText('Solve for x in 2x + 4 = 10')).toBeInTheDocument();
    expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: START_NEW_PRACTICE_BUTTON })).toBeInTheDocument();
  });

  it('navigates back to the dashboard from the results CTA', async () => {
    useResultsStore.getState().setLatestResult(RESULT);
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: BACK_TO_DASHBOARD_BUTTON }));

    expect(navigateMock).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  });
});
