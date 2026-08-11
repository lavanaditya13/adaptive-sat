import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionCard } from './SectionCard';
import { SECTION_DESCRIPTIONS } from './SectionCard.constants';

const MATH_SECTION = {
  section_id: 1,
  name: 'math',
  display_name: 'Math',
  accuracy_percentage: 82,
  questions_completed: 148,
  topics_count: 5,
};

describe('SectionCard', () => {
  it('renders the section name, description, and its three stats', () => {
    render(<SectionCard section={MATH_SECTION} onOpen={vi.fn()} />);

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText(SECTION_DESCRIPTIONS.math)).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('148')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('falls back to the display name when the section has no description', () => {
    render(
      <SectionCard
        section={{ ...MATH_SECTION, name: 'unknown_section', display_name: 'Unknown Section' }}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getAllByText('Unknown Section').length).toBeGreaterThan(0);
  });

  it('calls onOpen with the section when the card is clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<SectionCard section={MATH_SECTION} onOpen={onOpen} />);

    await user.click(screen.getByText('Math'));

    expect(onOpen).toHaveBeenCalledWith(MATH_SECTION);
  });
});
