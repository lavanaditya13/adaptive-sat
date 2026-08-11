import type { MasteryState } from './MasteryPill.constants';

export const PILL_STYLES =
  'inline-flex shrink-0 items-center gap-1 rounded-md border px-[7px] py-px text-[10px] font-semibold';

export const PILL_TONE_STYLES: Record<MasteryState, string> = {
  mastered: 'border-warning-solid/20 bg-warning-solid/15 text-warning',
  'in-progress': 'border-hairline-strong bg-white/[0.04] text-ink-muted',
  'not-started': 'border-hairline bg-transparent text-ink-dim',
};

export const PILL_ICON_STYLES = 'size-[9px]';
