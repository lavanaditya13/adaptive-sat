import type { StatTone } from './StatCard.constants';

export const CARD_STYLES = 'rounded-2xl border bg-surface-card p-[18px]';
export const HEADER_ROW_STYLES = 'mb-3.5 flex items-start justify-between gap-3';
export const LABEL_STYLES =
  'm-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted';
export const ICON_TILE_STYLES =
  'flex size-[34px] shrink-0 items-center justify-center rounded-lg';
export const ICON_STYLES = 'size-[15px]';
export const VALUE_STYLES = 'm-0 mb-1 font-mono text-[28px] font-bold leading-tight';
export const CAPTION_STYLES = 'm-0 text-xs text-ink-muted';

interface ToneStyles {
  border: string;
  tile: string;
  value: string;
}

/* `streak` has no design token — #fb923c is the design's streak orange, used
   only here, so it stays an arbitrary value rather than a new global token. */
export const TONE_STYLES: Record<StatTone, ToneStyles> = {
  success: {
    border: 'border-success-solid/25',
    tile: 'bg-success-solid/22 text-success',
    value: 'text-success',
  },
  math: {
    border: 'border-math/28',
    tile: 'bg-math/22 text-math-light',
    value: 'text-math-light',
  },
  reading: {
    border: 'border-reading/28',
    tile: 'bg-reading/22 text-reading-light',
    value: 'text-reading-light',
  },
  streak: {
    border: 'border-[#fb923c]/28',
    tile: 'bg-[#fb923c]/22 text-[#fb923c]',
    value: 'text-[#fb923c]',
  },
};
