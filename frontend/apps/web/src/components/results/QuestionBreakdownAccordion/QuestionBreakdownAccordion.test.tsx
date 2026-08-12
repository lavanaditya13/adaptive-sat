import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionBreakdownAccordion } from './QuestionBreakdownAccordion';
import type { QuestionBreakdownItem } from '@/types/api';

const baseItem: QuestionBreakdownItem = {
  question_id: 1,
  topic_display_name: 'Algebra',
  prompt: 'If 3x + 7 = 22, what is x?',
  choices: { A: '5', B: '6', C: '7', D: '8' },
  correct_answer: 'A',
  selected_answer: 'A',
  is_correct: true,
  confidence_level: 4,
  explanation: null,
  time_spent_seconds: null,
};

describe('QuestionBreakdownAccordion', () => {
  it('renders the recorded time spent per question as m:ss', () => {
    render(<QuestionBreakdownAccordion items={[{ ...baseItem, time_spent_seconds: 90 }]} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('falls back to 0:00 when time_spent_seconds is missing', () => {
    render(<QuestionBreakdownAccordion items={[{ ...baseItem, time_spent_seconds: null }]} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});
