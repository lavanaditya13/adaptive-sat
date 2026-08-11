import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeModal } from './PracticeModal';
import { selectSection } from '@/services/practice-service';
import { TOPIC_MODE_TITLE, SUBTITLE_CHOOSE_MODE, BACK_TO_OPTIONS } from './PracticeModal.constants';

vi.mock('@/services/practice-service', () => ({
  selectSection: vi.fn(),
  startPractice: vi.fn(),
}));

const MATH_SECTION = { section_id: 1, name: 'math', display_name: 'Math' };

const SECTION_CONTEXT = {
  practice_options: [
    {
      mode: 'section' as const,
      title: 'Full Section Practice',
      description: 'Mixed questions across every topic',
      is_locked: false,
      question_count: 20,
    },
  ],
  topics: [
    { topic_id: 7, name: 'linear_equations', display_name: 'Linear Equations' },
    { topic_id: 8, name: 'geometry', display_name: 'Geometry' },
  ],
};

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PracticeModal section={MATH_SECTION} open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeModal', () => {
  beforeEach(() => {
    vi.mocked(selectSection).mockReset();
  });

  it('renders the section name and its practice options once loaded', async () => {
    vi.mocked(selectSection).mockResolvedValue(SECTION_CONTEXT);

    renderModal();

    expect(await screen.findByText('Full Section Practice')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText(SUBTITLE_CHOOSE_MODE)).toBeInTheDocument();
    expect(screen.getByText(TOPIC_MODE_TITLE)).toBeInTheDocument();
  });

  it('switches to the topic list and back when the topic mode option is chosen', async () => {
    vi.mocked(selectSection).mockResolvedValue(SECTION_CONTEXT);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderModal();
    await user.click(await screen.findByText(TOPIC_MODE_TITLE));

    expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    expect(screen.getByText('Geometry')).toBeInTheDocument();
    expect(screen.queryByText('Full Section Practice')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: BACK_TO_OPTIONS }));

    expect(screen.getByText('Full Section Practice')).toBeInTheDocument();
  });

  it('shows an error with a retry button when the section context fails to load', async () => {
    vi.mocked(selectSection).mockRejectedValue(new Error('network error'));

    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/something went wrong loading this section/i)).toBeInTheDocument();
  });
});
