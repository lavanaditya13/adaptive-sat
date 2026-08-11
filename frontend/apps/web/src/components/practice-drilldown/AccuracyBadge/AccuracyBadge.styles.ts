import type { AccuracyTone } from './AccuracyBadge.constants';

export const BADGE_STYLES =
  'shrink-0 rounded-md border px-2.5 py-[3px] font-mono text-xs font-bold tabular-nums';

export const BADGE_TONE_STYLES: Record<AccuracyTone, string> = {
  success: 'border-success-solid/20 bg-success-solid/15 text-success',
  warning: 'border-warning-solid/20 bg-warning-solid/15 text-warning',
  neutral: 'border-hairline-strong bg-white/[0.05] text-ink-muted',
};

/** Bare text colour for the same scale, used by the confirm screen stat. */
export const ACCURACY_TEXT_STYLES: Record<AccuracyTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-ink-muted',
};
