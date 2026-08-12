import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionHeader } from './SessionHeader';
import { getSessionAccent } from '@/components/practice/session-accent';
import type { SegmentState } from '@/components/practice/ProgressBar/ProgressBar.constants';

vi.mock('@/utils/load-desmos-script', () => ({
  loadDesmosScript: vi.fn(),
}));

const CALCULATOR_BUTTON_NAME = /open calculator/i;

const baseProps = {
  currentPosition: 1,
  totalQuestions: 10,
  questionSeconds: 12,
  sessionSeconds: 120,
  segments: [] as SegmentState[],
  isPaused: false,
  onOpenNav: vi.fn(),
  onTogglePause: vi.fn(),
};

describe('SessionHeader', () => {
  it('shows the Desmos calculator toggle for a math question', () => {
    render(
      <SessionHeader {...baseProps} accent={getSessionAccent('math')} section="math" />
    );

    expect(screen.getByRole('button', { name: CALCULATOR_BUTTON_NAME })).toBeInTheDocument();
  });

  it('hides the Desmos calculator toggle for a reading & writing question', () => {
    render(
      <SessionHeader
        {...baseProps}
        accent={getSessionAccent('reading_writing')}
        section="reading_writing"
      />
    );

    expect(screen.queryByRole('button', { name: CALCULATOR_BUTTON_NAME })).not.toBeInTheDocument();
  });

  it('hides the Desmos calculator toggle when the section is not yet known', () => {
    render(<SessionHeader {...baseProps} accent={getSessionAccent(undefined)} section={undefined} />);

    expect(screen.queryByRole('button', { name: CALCULATOR_BUTTON_NAME })).not.toBeInTheDocument();
  });
});
