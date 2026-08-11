import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSubjectPage } from './PracticeSubjectPage';
import { getSkillTree } from '@/services/skill-tree-service';
import type { SkillTreeResponse } from '@/types/api';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/skill-tree-service', () => ({
  getSkillTree: vi.fn(),
}));

function buildTree(section: 'math' | 'reading_writing'): SkillTreeResponse {
  return {
    section,
    sectionDisplayName: section === 'math' ? 'Math' : 'Reading & Writing',
    masteryRule: { accuracy: 85, minQuestions: 10 },
    domains: [
      {
        name: 'Algebra',
        topicId: 1,
        topicCode: 'ALGEBRA',
        accuracy: 80,
        questionsAttempted: 20,
        questionsCorrect: 16,
        mastered: false,
        skills: [],
      },
    ],
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PracticeSubjectPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PracticeSubjectPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(getSkillTree).mockImplementation((section) =>
      Promise.resolve(buildTree(section as 'math' | 'reading_writing'))
    );
  });

  it('renders a card per subject with aggregated accuracy and domain counts', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('80%')).toHaveLength(2);
    });

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Reading & Writing')).toBeInTheDocument();
    expect(screen.getAllByText('20')).toHaveLength(2);
  });

  it('navigates to the subject home when a card is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Math'));
    await user.click(screen.getByText('Math').closest('button')!);

    expect(navigateMock).toHaveBeenCalledWith('/practice/math');
  });
});
