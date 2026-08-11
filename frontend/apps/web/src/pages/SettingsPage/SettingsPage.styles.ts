export const PAGE_CONTAINER_STYLES = 'mx-auto max-w-[640px] px-5 pb-12 pt-8';

export const HEADER_STYLES = 'mb-7';
export const HEADER_TITLE_STYLES = 'm-0 mb-1.5 text-2xl font-extrabold text-ink';
export const HEADER_SUBTITLE_STYLES = 'm-0 text-[13px] text-ink-muted';

export const CARD_STYLES =
  'mb-5 overflow-hidden rounded-2xl border border-hairline-strong bg-surface-card shadow-[0_1px_2px_rgba(0,0,0,0.2)] last:mb-0';
export const CARD_BODY_STYLES = 'px-6 pt-6 pb-1';
export const CARD_BODY_FLUSH_STYLES = 'px-6 py-6';

export const SECTION_HEADER_ROW_STYLES = 'mb-5 flex items-center gap-3';
const ICON_TILE_BASE_STYLES = 'flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-[18px]';
export const ICON_TILE_PROFILE_STYLES = `${ICON_TILE_BASE_STYLES} bg-math/15 text-math-light`;
export const ICON_TILE_LINKED_STYLES = `${ICON_TILE_BASE_STYLES} bg-reading/15 text-reading-light`;
export const ICON_TILE_NOTIF_STYLES = `${ICON_TILE_BASE_STYLES} bg-warning/15 text-warning`;
export const SECTION_TITLE_STYLES = 'm-0 text-[15px] font-bold text-ink';
export const SECTION_SUBTITLE_STYLES = 'm-0 mt-0.5 text-xs text-ink-muted';

export const IDENTITY_ROW_STYLES =
  'mb-[22px] flex items-center gap-3.5 rounded-xl border border-hairline bg-white/[0.03] p-3.5';
export const IDENTITY_AVATAR_STYLES =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-math-button font-mono text-[15px] font-bold text-white';
export const IDENTITY_NAME_STYLES = 'm-0 truncate text-sm font-bold text-ink';
export const IDENTITY_EMAIL_STYLES = 'm-0 mt-0.5 truncate text-xs text-ink-muted';

export const FIELD_STACK_STYLES = 'flex flex-col gap-[18px]';
export const FIELD_GRID_STYLES = 'grid grid-cols-1 gap-3.5 sm:grid-cols-2';
export const FIELD_LABEL_STYLES = 'mb-[7px] block text-xs font-semibold text-ink-secondary';
export const FIELD_INPUT_STYLES =
  'h-auto w-full rounded-[10px] border border-white/10 bg-surface-content px-3.5 py-2.5 text-[13px] text-ink outline-none focus-visible:border-math focus-visible:ring-0';
export const READONLY_FIELD_STYLES =
  'rounded-[10px] border border-hairline bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-ink';
export const READONLY_HELPER_STYLES = 'm-0 mt-1.5 text-[11px] text-ink-muted';

export const FOOTER_DIVIDER_STYLES = 'mt-[22px] h-px bg-hairline';
export const FOOTER_ROW_STYLES = 'flex items-center justify-end gap-3 px-6 py-4';
export const UNSAVED_LABEL_STYLES = 'text-xs text-ink-muted';
export const SAVE_BUTTON_ENABLED_STYLES =
  'cursor-pointer rounded-[10px] border-none bg-math-button px-5 py-2.5 text-[13px] font-bold text-white hover:opacity-90';
export const SAVE_BUTTON_DISABLED_STYLES =
  'cursor-not-allowed rounded-[10px] border-none bg-math-button/25 px-5 py-2.5 text-[13px] font-bold text-white/35';

export const SKELETON_ROW_STYLES = 'h-16 w-full rounded-xl';
export const ADD_PROVIDER_BUTTON_STYLES =
  'mt-4 rounded-[10px] border-white/10 bg-transparent text-ink-secondary hover:bg-white/[0.04] hover:text-ink';

export const NOTIF_COMING_SOON_STYLES =
  'mb-4 rounded-lg border border-hairline bg-white/[0.03] px-3.5 py-2.5 text-xs text-ink-muted';
export const NOTIF_LIST_STYLES = 'flex flex-col divide-y divide-hairline';
export const NOTIF_ROW_STYLES = 'flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0';
export const NOTIF_LABEL_STYLES = 'm-0 text-sm font-semibold text-ink';
export const NOTIF_DESC_STYLES = 'm-0 mt-0.5 text-xs text-ink-muted';

export const TOGGLE_TRACK_STYLES = 'relative inline-flex h-6 w-10 shrink-0 cursor-not-allowed items-center rounded-full';
export const TOGGLE_TRACK_ON_STYLES = `${TOGGLE_TRACK_STYLES} bg-math/40`;
export const TOGGLE_TRACK_OFF_STYLES = `${TOGGLE_TRACK_STYLES} bg-white/10`;
export const TOGGLE_KNOB_STYLES = 'inline-block size-4 rounded-full bg-white/70 transition-transform';
export const TOGGLE_KNOB_ON_STYLES = `${TOGGLE_KNOB_STYLES} translate-x-[19px]`;
export const TOGGLE_KNOB_OFF_STYLES = `${TOGGLE_KNOB_STYLES} translate-x-1`;
