import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesmosCalculator } from './DesmosCalculator';
import { loadDesmosScript } from '@/utils/load-desmos-script';
import {
  CALCULATOR_BUTTON_LABEL,
  CALCULATOR_DIALOG_TITLE,
  CLOSE_BUTTON_LABEL,
  GRAPHING_TAB_LABEL,
  LOAD_ERROR_MESSAGE,
  RETRY_BUTTON_LABEL,
  SCIENTIFIC_TAB_LABEL,
} from './DesmosCalculator.constants';

vi.mock('@/utils/load-desmos-script', () => ({
  loadDesmosScript: vi.fn(),
}));

const graphingDestroy = vi.fn();
const scientificDestroy = vi.fn();
const graphingCalculatorMock = vi.fn(() => ({ destroy: graphingDestroy }));
const scientificCalculatorMock = vi.fn(() => ({ destroy: scientificDestroy }));

const fakeDesmos = {
  GraphingCalculator: graphingCalculatorMock,
  ScientificCalculator: scientificCalculatorMock,
};

// `role="dialog"` is only present on the shell once it's open -- the panel
// stays clipped/inert behind the collapsed trigger otherwise, matching the
// "small icon that grows into the calculator" behavior (no separate
// modal/backdrop element to query in the closed state).
function queryDialog() {
  return screen.queryByRole('dialog', { name: CALCULATOR_DIALOG_TITLE });
}

async function openCalculator(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: CALCULATOR_BUTTON_LABEL }));
  await waitFor(() => expect(graphingCalculatorMock).toHaveBeenCalledTimes(1));
}

describe('DesmosCalculator', () => {
  beforeEach(() => {
    vi.mocked(loadDesmosScript).mockReset();
    graphingDestroy.mockReset();
    scientificDestroy.mockReset();
    graphingCalculatorMock.mockClear();
    scientificCalculatorMock.mockClear();
    vi.mocked(loadDesmosScript).mockResolvedValue(fakeDesmos as never);
  });

  it('renders the collapsed trigger button with an accessible label, no dialog yet', () => {
    render(<DesmosCalculator />);

    expect(screen.getByRole('button', { name: CALCULATOR_BUTTON_LABEL })).toBeInTheDocument();
    expect(queryDialog()).not.toBeInTheDocument();
    expect(loadDesmosScript).not.toHaveBeenCalled();
  });

  it('expands into the calculator and lazily instantiates both calculators exactly once', async () => {
    const user = userEvent.setup();
    render(<DesmosCalculator />);

    await openCalculator(user);

    expect(queryDialog()).toBeInTheDocument();
    expect(loadDesmosScript).toHaveBeenCalledTimes(1);
    expect(graphingCalculatorMock).toHaveBeenCalledTimes(1);
    expect(scientificCalculatorMock).toHaveBeenCalledTimes(1);

    // Collapsing and reopening must not create a second pair of instances.
    await user.click(screen.getByRole('button', { name: CLOSE_BUTTON_LABEL }));
    await user.click(screen.getByRole('button', { name: CALCULATOR_BUTTON_LABEL }));

    expect(loadDesmosScript).toHaveBeenCalledTimes(1);
    expect(graphingCalculatorMock).toHaveBeenCalledTimes(1);
    expect(scientificCalculatorMock).toHaveBeenCalledTimes(1);
  });

  it('does not reinstantiate the calculators when switching tabs', async () => {
    const user = userEvent.setup();
    render(<DesmosCalculator />);
    await openCalculator(user);

    await user.click(screen.getByRole('button', { name: SCIENTIFIC_TAB_LABEL }));
    await user.click(screen.getByRole('button', { name: GRAPHING_TAB_LABEL }));

    expect(graphingCalculatorMock).toHaveBeenCalledTimes(1);
    expect(scientificCalculatorMock).toHaveBeenCalledTimes(1);
  });

  it('does not destroy the calculators when collapsed back down', async () => {
    const user = userEvent.setup();
    render(<DesmosCalculator />);
    await openCalculator(user);

    await user.click(screen.getByRole('button', { name: CLOSE_BUTTON_LABEL }));

    expect(queryDialog()).not.toBeInTheDocument();
    expect(graphingDestroy).not.toHaveBeenCalled();
    expect(scientificDestroy).not.toHaveBeenCalled();
  });

  it('closes when Escape is pressed, without destroying the calculators', async () => {
    const user = userEvent.setup();
    render(<DesmosCalculator />);
    await openCalculator(user);

    await user.keyboard('{Escape}');

    expect(queryDialog()).not.toBeInTheDocument();
    expect(graphingDestroy).not.toHaveBeenCalled();
  });

  it('destroys both calculators when the owning component unmounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DesmosCalculator />);
    await openCalculator(user);

    unmount();

    expect(graphingDestroy).toHaveBeenCalledTimes(1);
    expect(scientificDestroy).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly error and allows retrying when the script fails to load', async () => {
    vi.mocked(loadDesmosScript).mockReset();
    vi.mocked(loadDesmosScript).mockRejectedValueOnce(new Error('network error'));
    vi.mocked(loadDesmosScript).mockResolvedValueOnce(fakeDesmos as never);
    const user = userEvent.setup();
    render(<DesmosCalculator />);

    await user.click(screen.getByRole('button', { name: CALCULATOR_BUTTON_LABEL }));

    expect(await screen.findByText(LOAD_ERROR_MESSAGE)).toBeInTheDocument();
    expect(graphingCalculatorMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: RETRY_BUTTON_LABEL }));

    await waitFor(() => expect(graphingCalculatorMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(LOAD_ERROR_MESSAGE)).not.toBeInTheDocument();
  });
});
