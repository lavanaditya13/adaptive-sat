export type DesmosTabId = 'graphing' | 'scientific';

export const CALCULATOR_BUTTON_LABEL = 'Open calculator';
export const CALCULATOR_DIALOG_TITLE = 'Calculator';
export const CLOSE_BUTTON_LABEL = 'Close calculator';
export const GRAPHING_TAB_LABEL = 'Graphing';
export const SCIENTIFIC_TAB_LABEL = 'Scientific';
export const LOADING_MESSAGE = 'Loading calculator…';
export const LOAD_ERROR_MESSAGE =
  "We couldn't load the calculator. Check your connection and try again.";
export const RETRY_BUTTON_LABEL = 'Retry';

export const DESMOS_TABS: Array<{ id: DesmosTabId; label: string }> = [
  { id: 'graphing', label: GRAPHING_TAB_LABEL },
  { id: 'scientific', label: SCIENTIFIC_TAB_LABEL },
];

// Desmos calculator constructor options. Kept minimal/default -- `border:
// false` since our own dialog chrome already frames the calculator.
export const GRAPHING_CALCULATOR_OPTIONS = {
  border: false,
  expressions: true,
  keypad: true,
  settingsMenu: true,
};

export const SCIENTIFIC_CALCULATOR_OPTIONS = {
  border: false,
};
