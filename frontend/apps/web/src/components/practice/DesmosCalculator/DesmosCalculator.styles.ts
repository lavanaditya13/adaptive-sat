// The whole launcher is one fixed, top-right-anchored shell that morphs
// between a small round trigger and the full calculator panel by animating
// width/height/border-radius directly on itself -- there's no separate
// modal/backdrop popping up over the page. This reads as the icon growing
// into the calculator in place, matching iOS AssistiveTouch's bubble-expands
// behavior, rather than a dialog appearing.
//
// `top-16` (not `top-5`) deliberately clears the app shell's own sticky
// header (`Header.styles.ts`'s `min-h-[52px]`, `sticky top-0`) -- this shell
// is `fixed` to the viewport, independent of where SessionHeader sits in the
// page's normal document flow, so it would otherwise sit half-behind/half-
// over the app header's bottom border regardless of scroll position.
export const SHELL_BASE_STYLES =
  'fixed top-16 right-5 z-50 overflow-hidden bg-card shadow-xl ring-1 ring-foreground/10 transition-[width,height,border-radius] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';
export const SHELL_CLOSED_STYLES = 'size-12 rounded-full';
export const SHELL_OPEN_STYLES = 'h-[min(75vh,640px)] w-[min(92vw,880px)] rounded-2xl';

// The trigger fills the shell's *current* (animating) size, so the icon
// stays centered in the small circle while collapsed, then fades out as
// soon as the grow animation starts.
export const TRIGGER_BUTTON_STYLES =
  'absolute inset-0 flex cursor-pointer items-center justify-center bg-primary text-primary-foreground transition-opacity duration-150';
export const TRIGGER_BUTTON_VISIBLE_STYLES = 'opacity-100';
export const TRIGGER_BUTTON_HIDDEN_STYLES = 'pointer-events-none opacity-0';

// The panel is sized to the shell's fully-open dimensions at all times --
// never animated itself -- and anchored to the same top-right corner as the
// shell (so it grows *down and left* from the icon, matching the shell being
// pinned near the top of the viewport rather than the bottom), so while the
// shell is collapsed it's simply clipped away by the shell's own
// `overflow-hidden` instead of being squeezed into the small circle. That
// means the Desmos containers inside it never see a resize caused by our own
// open/close animation, only a clip + opacity change, so nothing needs to
// call `.resize()` on them.
export const PANEL_STYLES =
  'absolute top-0 right-0 flex h-[min(75vh,640px)] w-[min(92vw,880px)] flex-col gap-3 p-4 transition-opacity duration-200';
export const PANEL_VISIBLE_STYLES = 'opacity-100 delay-100';
export const PANEL_HIDDEN_STYLES = 'pointer-events-none opacity-0';

// Transparent click-outside-to-close catcher -- deliberately not dimmed
// (`bg-transparent`): the page stays fully visible and interactive around
// the calculator, unlike a modal backdrop.
export const CLICK_OUTSIDE_STYLES = 'fixed inset-0 z-40 bg-transparent';

export const HEADER_ROW_STYLES = 'flex shrink-0 items-center justify-between gap-3';
export const PANEL_TITLE_STYLES = 'text-base font-semibold leading-none tracking-tight';
export const CLOSE_BUTTON_STYLES =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export const TABS_ROW_STYLES = 'flex shrink-0 gap-1 rounded-lg bg-muted p-1';
export const TAB_BUTTON_BASE_STYLES =
  'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
export const TAB_BUTTON_ACTIVE_STYLES = 'bg-card text-foreground shadow-sm';
export const TAB_BUTTON_INACTIVE_STYLES = 'text-muted-foreground hover:text-foreground';

export const CALCULATOR_STAGE_STYLES =
  'relative min-h-0 flex-1 overflow-hidden rounded-lg ring-1 ring-foreground/10';
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
