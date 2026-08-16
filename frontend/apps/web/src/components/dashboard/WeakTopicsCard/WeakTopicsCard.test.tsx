import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeakTopicsCard } from './WeakTopicsCard';
import type { WeakTopic } from '@/types/api';

const MATH_TOPIC: WeakTopic = {
  topic_id: 14,
  display_name: 'Algebra',
  mastery_score: 45,
  questions_attempted: 20,
  questions_correct: 9,
  section: 'math',
  section_id: 1,
  section_display_name: 'Math',
  practice_topic_id: 1,
};

/* No section could be resolved, so there is nothing to deep-link into. */
const UNPRACTISABLE_TOPIC: WeakTopic = {
  topic_id: 99,
  display_name: 'Retired Topic',
  mastery_score: 30,
  questions_attempted: 4,
  questions_correct: 1,
  section: null,
  section_id: null,
  section_display_name: null,
  practice_topic_id: null,
};

describe('WeakTopicsCard', () => {
  it('renders each weak topic with its section and attempt metadata', () => {
    render(<WeakTopicsCard topics={[MATH_TOPIC]} onPractice={vi.fn()} />);

    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('9 of 20 correct')).toBeInTheDocument();
  });

  it('hands the whole topic back so the page can start its practice session', async () => {
    const onPractice = vi.fn();
    const user = userEvent.setup();

    render(<WeakTopicsCard topics={[MATH_TOPIC]} onPractice={onPractice} />);

    await user.click(screen.getByRole('button', { name: 'Practice Algebra' }));

    expect(onPractice).toHaveBeenCalledWith(MATH_TOPIC);
  });

  it('disables every start button while one session is being started', () => {
    render(
      <WeakTopicsCard topics={[MATH_TOPIC]} onPractice={vi.fn()} startingTopicId={14} />
    );

    const button = screen.getByRole('button', { name: 'Practice Algebra' });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Starting…');
  });

  it('still lists a topic that has no practisable questions, without a start action', () => {
    render(<WeakTopicsCard topics={[UNPRACTISABLE_TOPIC]} onPractice={vi.fn()} />);

    expect(screen.getByText('Retired Topic')).toBeInTheDocument();
    expect(screen.getByText('No questions yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explains the empty state when there are no weak topics yet', () => {
    render(<WeakTopicsCard topics={[]} onPractice={vi.fn()} />);

    expect(
      screen.getByText('Answer a few questions and your weakest topics will show up here.')
    ).toBeInTheDocument();
  });
});
