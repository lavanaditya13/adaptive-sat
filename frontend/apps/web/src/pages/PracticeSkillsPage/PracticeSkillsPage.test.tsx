import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSkillsPage } from './PracticeSkillsPage';
import { getSkillTree, type SkillTreeResponse } from '@/services/skill-tree-service';
import { useAppShellStore } from '@/store/app-shell-store';

vi.mock('@/services/skill-tree-service', () => ({ getSkillTree: vi.fn() }));

const TREE: SkillTreeResponse = {
  section: 'reading_writing',
  sectionDisplayName: 'Reading & Writing',
  masteryRule: { accuracy: 85, minQuestions: 10 },
  domains: [
    {
      name: 'Craft and Structure',
      topicId: 1,
      topicCode: 'CRAFT_STRUCTURE',
      accuracy: 70,
      questionsAttempted: 20,
      questionsCorrect: 14,
      mastered: false,
      skills: [
        { name: 'Words in context', accuracy: 75, questionsAttempted: 12, questionsCorrect: 9, mastered: false },
        { name: 'General', accuracy: 62, questionsAttempted: 8, questionsCorrect: 5, mastered: false },
      ],
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderPage(path = '/practice/reading_writing/domains/Craft%20and%20Structure') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/practice/:subject/domains/:domain" element={<PracticeSkillsPage />} />
          <Route path="*" element={<p>fallback</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeSkillsPage', () => {
  beforeEach(() => {
    vi.mocked(getSkillTree).mockReset();
    vi.mocked(getSkillTree).mockResolvedValue(TREE);
    useAppShellStore.setState({ toastMessage: null });
  });

  it('renders the decoded domain, its summary and each of its skills', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Craft and Structure' })).toBeInTheDocument()
    );

    expect(screen.getByText('2 skills · 20 questions attempted')).toBeInTheDocument();
    expect(screen.getByText('Words in context')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start full Craft and Structure test' })
    ).toBeInTheDocument();
  });

  it('starts a skill-scoped confirm from a skill row', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Words in context')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Start' })[0]);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practice/reading_writing/confirm?scope=skill&domain=Craft+and+Structure&skill=Words+in+context'
    );
  });

  it('starts a domain-scoped confirm from the full domain test button', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Craft and Structure' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /start full/i }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practice/reading_writing/confirm?scope=domain&domain=Craft+and+Structure'
    );
  });

  it('redirects a stale domain link back to the domain list and warns once', async () => {
    renderPage('/practice/reading_writing/domains/Cross-text%20Connections');

    await waitFor(() =>
      expect(useAppShellStore.getState().toastMessage).toMatch(/no longer available/i)
    );
    expect(screen.getByTestId('location').textContent).toBe(
      '/practice/reading_writing/domains'
    );
  });
});
