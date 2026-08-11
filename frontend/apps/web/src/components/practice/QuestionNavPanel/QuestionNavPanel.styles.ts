export const OVERLAY_STYLES = 'fixed inset-0 z-[69] bg-black/60';
export const PANEL_DESKTOP_STYLES =
  'fixed top-1/2 left-1/2 z-70 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-surface-card p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]';
/** Below 900px the same panel becomes a bottom sheet. */
export const PANEL_SHEET_STYLES =
  'fixed inset-x-0 bottom-0 z-70 rounded-t-2xl border-t border-white/10 bg-surface-card p-5 pb-8 shadow-[0_-12px_32px_rgba(0,0,0,0.5)]';
export const TITLE_ROW_STYLES = 'mb-3.5 flex items-center justify-between gap-3';
export const TITLE_STYLES = 'm-0 text-sm font-bold text-ink';
export const CLOSE_BUTTON_STYLES =
  'flex size-7 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink';
export const GRID_STYLES = 'grid grid-cols-5 gap-2';
export const DOT_STYLES =
  'flex size-[30px] items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors';
export const DOT_ENABLED_STYLES = 'cursor-pointer';
export const DOT_LOCKED_STYLES =
  'cursor-not-allowed border-hairline-strong bg-white/[0.05] text-ink-dim opacity-60';
export const DOT_NEUTRAL_STYLES = 'border-hairline-strong bg-white/[0.05] text-ink-muted';
export const DOT_SKIPPED_STYLES = 'border-dashed border-warning/50 bg-warning/15 text-warning';
export const LEGEND_STYLES = 'mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5';
export const LEGEND_ITEM_STYLES = 'flex items-center gap-1.5 text-[11px] text-ink-muted';
export const LEGEND_SWATCH_STYLES = 'size-2 rounded-full';
