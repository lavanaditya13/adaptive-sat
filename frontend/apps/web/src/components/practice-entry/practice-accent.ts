import { getSectionTheme, type SectionName } from '@/constants/section-theme';
import type { LucideIcon } from 'lucide-react';

export interface PracticeAccent {
  /** Section icon — sourced from the shared section theme. */
  icon: LucideIcon;
  /** 44/46px icon tile fill (design: rgba(accent, 0.15)). */
  iconTile: string;
  /** 38px mode-card tile fill (design: rgba(accent, 0.1)). */
  tileSoft: string;
  /** Accent text: #818cf8 / #a78bfa. */
  text: string;
  /** Feature-card border at 30%. */
  border: string;
  /** Primary CTA fill: #4f46e5 / #7c3aed. */
  button: string;
  /** Accuracy-ring SVG stroke: #6366f1 / #8b5cf6. */
  ringStroke: string;
}

/**
 * Class-name variants the design needs that `constants/section-theme.ts` does
 * not expose (the 0.15 tint, the darker button fill and the ring stroke).
 * Tailwind only emits classes it can see as literals, so each variant is spelled
 * out here rather than composed at runtime from the shared theme.
 *
 * Which accent family belongs to which section still comes from the shared
 * helper — `getPracticeAccent` reads the icon straight off `getSectionTheme`.
 */
const ACCENT_VARIANTS: Record<SectionName, Omit<PracticeAccent, 'icon'>> = {
  math: {
    iconTile: 'bg-math/15',
    tileSoft: 'bg-math/10',
    text: 'text-math-light',
    border: 'border-math/30',
    button: 'bg-math-button hover:bg-math',
    ringStroke: 'stroke-math',
  },
  reading_writing: {
    iconTile: 'bg-reading/15',
    tileSoft: 'bg-reading/10',
    text: 'text-reading-light',
    border: 'border-reading/30',
    button: 'bg-reading-button hover:bg-reading',
    ringStroke: 'stroke-reading',
  },
};

export function getPracticeAccent(section: string): PracticeAccent {
  const variant = ACCENT_VARIANTS[section as SectionName] ?? ACCENT_VARIANTS.math;

  return { icon: getSectionTheme(section).icon, ...variant };
}
