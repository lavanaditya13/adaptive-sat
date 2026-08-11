import { getSectionTheme, type SectionName } from '@/constants/section-theme';
import type { LucideIcon } from 'lucide-react';

export interface DrilldownAccent {
  /** Subject glyph (calculator / book) — owned by `section-theme`. */
  icon: LucideIcon;
  /** Light accent text (`--math-light` / `--reading-light`). */
  text: string;
  /** 15% accent wash used behind icon tiles. */
  tint: string;
  border: string;
  /** Solid accent used for progress fills. */
  bar: string;
  /** Deeper accent reserved for primary buttons. */
  button: string;
}

/* Token utility classes per section. `section-theme` covers icon/text/border
   for the shell, but the drill-down also needs the light and button ramps, so
   those are mapped here off the same section key — token names only, no hex. */
const ACCENT_CLASSES: Record<SectionName, Omit<DrilldownAccent, 'icon'>> = {
  math: {
    text: 'text-math-light',
    tint: 'bg-math/15',
    border: 'border-math/30',
    bar: 'bg-math',
    button: 'bg-math-button hover:bg-math',
  },
  reading_writing: {
    text: 'text-reading-light',
    tint: 'bg-reading/15',
    border: 'border-reading/30',
    bar: 'bg-reading',
    button: 'bg-reading-button hover:bg-reading',
  },
};

export function getDrilldownAccent(section: SectionName): DrilldownAccent {
  return { icon: getSectionTheme(section).icon, ...ACCENT_CLASSES[section] };
}
