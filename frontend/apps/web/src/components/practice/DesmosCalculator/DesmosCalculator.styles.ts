// Toggle button matches SessionHeader's PAUSE_BUTTON_STYLES exactly, so the
// calculator icon sits visually consistent with the pause/resume control.
export const TOGGLE_BUTTON_STYLES =
  'flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-hairline-strong bg-surface-card text-ink-secondary transition-colors hover:text-ink';

// The overlay wrapper is always mounted (never conditionally unmounted like
// the shared `Dialog` component) so the Desmos calculator containers inside
// it never lose their DOM node -- toggling `hidden` only changes CSS
// visibility, preserving whatever the student graphed across close/reopen.
export const OVERLAY_BASE_STYLES = 'fixed inset-0 z-50 items-center justify-center p-4';
export const OVERLAY_OPEN_STYLES = 'flex';
export const OVERLAY_CLOSED_STYLES = 'hidden';
export const BACKDROP_STYLES = 'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity';

export const DIALOG_CONTENT_STYLES =
  'relative z-50 flex h-[80vh] max-h-[720px] w-full max-w-4xl flex-col gap-4';
export const HEADER_ROW_STYLES = 'flex items-center justify-between gap-3';
export const CLOSE_BUTTON_STYLES =
  'flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export const TABS_ROW_STYLES = 'flex gap-1 rounded-lg bg-muted p-1';
export const TAB_BUTTON_BASE_STYLES =
  'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
export const TAB_BUTTON_ACTIVE_STYLES = 'bg-card text-foreground shadow-sm';
export const TAB_BUTTON_INACTIVE_STYLES = 'text-muted-foreground hover:text-foreground';

export const CALCULATOR_STAGE_STYLES =
  'relative min-h-[420px] flex-1 overflow-hidden rounded-lg ring-1 ring-foreground/10';
// `invisible` (visibility:hidden) keeps the inactive tab's container at full
// layout size instead of collapsing it -- collapsing (display:none/hidden)
// would zero out its pixel dimensions and Desmos renders a blank canvas for
// any container with zero height/width, including one instantiated while
// visibility-collapsed off-screen.
export const CALCULATOR_CONTAINER_STYLES = 'absolute inset-0 h-full w-full';
export const CALCULATOR_CONTAINER_HIDDEN_STYLES = 'invisible';

export const STATUS_OVERLAY_STYLES =
  'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center';
export const STATUS_TEXT_STYLES = 'text-sm text-muted-foreground';
export const RETRY_BUTTON_STYLES =
  'cursor-pointer rounded-md border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted';
