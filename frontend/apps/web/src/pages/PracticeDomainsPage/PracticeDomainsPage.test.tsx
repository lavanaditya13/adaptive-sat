import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeDomainsPage } from './PracticeDomainsPage';
import { getSkillTree, type SkillTreeResponse } from '@/services/skill-tree-service';

vi.mock('@/services/skill-tree-service', () => ({ getSkillTree: vi.fn() }));

const TREE: SkillTreeResponse = {
  section: 'math',
  sectionDisplayName: 'Math',
  masteryRule: { accuracy: 85, minQuestions: 10 },
  domains: [
    {
      name: 'Algebra',
      topicId: 2,
      topicCode: 'ALGEBRA',
      accuracy: 85,
      questionsAttempted: 38,
      questionsCorrect: 32,
      mastered: true,
      skills: [
        { name: 'Linear equations', accuracy: 90, questionsAttempted: 12, questionsCorrect: 11, mastered: true },
        { name: 'Linear functions', accuracy: 88, questionsAttempted: 10, questionsCorrect: 9, mastered: true },
        { name: 'Linear inequalities', accuracy: 70, questionsAttempted: 8, questionsCorrect: 6, mastered: false },
        { name: 'General', accuracy: 60, questionsAttempted: 8, questionsCorrect: 5, mastered: false },
      ],
    },
    {
      name: 'Geometry and Trigonometry',
      topicId: 3,
      topicCode: 'GEOMETRY',
      accuracy: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      mastered: false,
      skills: [],
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderPage(path = '/practice/math/domains') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/practice/:subject/domains" element={<PracticeDomainsPage />} />
          <Route path="*" element={<p>fallback</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeDomainsPage', () => {
  beforeEach(() => {
    vi.mocked(getSkillTree).mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(TREE);
  });

  it('lists every domain with its accuracy, attempt count and skill chips', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Algebra')).toBeInTheDocument());

    expect(getSkillTree).toHaveBeenCalledWith('math');
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('38 questions attempted')).toBeInTheDocument();
    expect(screen.getByText('Linear equations')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    expect(screen.getByText(/85%\+ accuracy over 10\+ questions/i)).toBeInTheDocument();
  });

  it('renders an untouched domain as not started rather than as a 0% score', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Geometry and Trigonometry')).toBeInTheDocument()
    );

    expect(screen.getByText('Not started yet')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('drills into a domain and starts a domain-scoped confirm', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Algebra')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: /view skills/i })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practice/math/domains/Algebra'
    );
  });

  it('sends the start button to the confirm screen with a domain scope', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Algebra')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: /start domain test/i })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practice/math/confirm?scope=domain&domain=Algebra'
    );
  });

  it('redirects an unknown subject back to practice instead of calling the API', async () => {
    renderPage('/practice/chemistry/domains');

    await waitFor(() => expect(screen.getByText('fallback')).toBeInTheDocument());
    expect(getSkillTree).not.toHaveBeenCalled();
  });
});
