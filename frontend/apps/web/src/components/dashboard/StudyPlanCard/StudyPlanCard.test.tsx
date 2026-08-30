import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyPlanCard } from './StudyPlanCard';
import type { StudyPlanResponse } from '@/types/api';

const PLAN: StudyPlanResponse = {
  id: 1,
  student_id: 1,
  title: 'Recommended Study Plan',
  status: 'active',
  items: [
    {
      topic_id: 14,
      topic_name: 'Algebra',
      priority: 'high',
      recommended_questions: 20,
      reason: 'Mastery score is 32%, so this topic should be reviewed.',
    },
    {
      topic_id: 33,
      topic_name: 'Craft and Structure',
      priority: 'low',
      recommended_questions: 10,
      reason: 'Mastery score is 76%, so this topic should be reviewed.',
    },
  ],
  created_at: '2026-08-20T09:00:00Z',
  updated_at: '2026-08-20T09:00:00Z',
};

const MIXED_PRACTICE_PLAN: StudyPlanResponse = {
  id: 2,
  student_id: 1,
  title: 'Recommended Study Plan',
  status: 'active',
  items: [
    {
      topic_id: null,
      topic_name: 'Mixed Practice',
      priority: 'medium',
      recommended_questions: 10,
      reason: 'No attempts found yet. Start with mixed practice to establish a baseline.',
    },
  ],
  created_at: '2026-08-20T09:00:00Z',
  updated_at: '2026-08-20T09:00:00Z',
};

describe('StudyPlanCard', () => {
  it('renders each plan item with its priority, reason and recommended question count', () => {
    render(<StudyPlanCard plan={PLAN} onRegenerate={vi.fn()} />);

    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(
      screen.getByText('Mastery score is 32%, so this topic should be reviewed.')
    ).toBeInTheDocument();
    expect(screen.getByText('20 questions recommended')).toBeInTheDocument();
    expect(screen.getByText('High priority')).toBeInTheDocument();

    expect(screen.getByText('Craft and Structure')).toBeInTheDocument();
    expect(screen.getByText('Low priority')).toBeInTheDocument();
  });

  it('renders a topic with no id (the mixed-practice fallback) without crashing', () => {
    render(<StudyPlanCard plan={MIXED_PRACTICE_PLAN} onRegenerate={vi.fn()} />);

    expect(screen.getByText('Mixed Practice')).toBeInTheDocument();
    expect(screen.getByText('Medium priority')).toBeInTheDocument();
  });

  it('fires onRegenerate when the regenerate button is clicked', async () => {
    const onRegenerate = vi.fn();
    const user = userEvent.setup();

    render(<StudyPlanCard plan={PLAN} onRegenerate={onRegenerate} />);
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('disables the regenerate button and relabels it while regenerating', () => {
    render(<StudyPlanCard plan={PLAN} onRegenerate={vi.fn()} isRegenerating />);

    const button = screen.getByRole('button', { name: 'Regenerating…' });
    expect(button).toBeDisabled();
  });

  it('explains the empty state when the plan has no items', () => {
    render(<StudyPlanCard plan={{ ...PLAN, items: [] }} onRegenerate={vi.fn()} />);

    expect(
      screen.getByText('Complete a practice session and your study plan will show up here.')
    ).toBeInTheDocument();
  });
});
