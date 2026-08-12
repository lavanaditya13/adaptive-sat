import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MathText } from './MathText';

describe('MathText', () => {
  it('renders plain text unchanged when there are no math delimiters', () => {
    render(<MathText text="What is the slope of this line?" />);

    expect(screen.getByText('What is the slope of this line?')).toBeInTheDocument();
  });

  it('renders a single inline math segment via KaTeX', () => {
    const { container } = render(<MathText text="If f(x) = $x^2 + 3$, what is f(4)?" />);

    expect(screen.getByText('If f(x) =', { exact: false })).toBeInTheDocument();
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('renders multiple math segments mixed with surrounding text', () => {
    const { container } = render(<MathText text="If $x^2$ equals $y^2$, then x = y or x = -y." />);

    expect(container.querySelectorAll('.katex')).toHaveLength(2);
  });

  it('degrades to literal text when a $ is unmatched', () => {
    render(<MathText text="The item costs $5 total" />);

    expect(screen.getByText('The item costs $5 total')).toBeInTheDocument();
  });

  it('renders escaped dollar signs as literal currency, not math delimiters', () => {
    const { container } = render(
      <MathText text="A flat fee of \$150 plus \$25 per guest, with $x^{2}$ guests." />
    );

    expect(
      screen.getByText('A flat fee of $150 plus $25 per guest, with', { exact: false })
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
  });
});
