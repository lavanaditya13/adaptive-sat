/* Design container: max-width 900px, padding 32px 24px 40px. The app shell
   supplies the sidebar, header and breadcrumbs around this. */
export const CONTAINER_STYLES = 'mx-auto max-w-[900px] px-6 pt-8 pb-10';

export const BANNER_WRAPPER_STYLES = 'mb-6';
export const GREETING_BLOCK_STYLES = 'mb-7';
export const GREETING_EYEBROW_STYLES = 'm-0 mb-1 text-[13px] text-ink-muted';
export const GREETING_STYLES = 'm-0 text-[28px] font-extrabold leading-tight text-ink';

/* Single column below the 900px mobile breakpoint. */
export const STATS_GRID_STYLES = 'mb-7 grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1';
export const SCORE_BLOCK_STYLES = 'mb-9';
export const WEAK_TOPICS_BLOCK_STYLES = 'mb-9';
export const SECTION_LABEL_STYLES =
  'm-0 mb-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted';
export const SECTIONS_GRID_STYLES =
  'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5';

export const EMPTY_PANEL_STYLES =
  'rounded-2xl border border-white/[0.07] bg-surface-card p-6 text-center';
export const EMPTY_TITLE_STYLES = 'm-0 mb-1.5 text-[15px] font-bold text-ink';
export const EMPTY_MESSAGE_STYLES = 'm-0 text-[13px] text-ink-muted';

export const ERROR_PANEL_STYLES =
  'rounded-2xl border border-danger/30 bg-surface-card p-6 text-center';
export const ERROR_MESSAGE_STYLES = 'm-0 mb-4 text-[13px] text-ink-secondary';

export const SKELETON_GREETING_STYLES = 'mb-7 h-[52px] w-64';
export const SKELETON_STAT_STYLES = 'h-[116px] rounded-2xl';
export const SKELETON_SCORE_STYLES = 'mb-9 h-[136px] rounded-2xl';
export const SKELETON_WEAK_TOPICS_STYLES = 'mb-9 h-[260px] rounded-2xl';
export const SKELETON_SECTION_LABEL_STYLES = 'mb-3.5 h-4 w-36';
export const SKELETON_SECTION_CARD_STYLES = 'h-[220px] rounded-2xl';
