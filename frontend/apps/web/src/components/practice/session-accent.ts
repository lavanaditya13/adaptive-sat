/**
 * Subject accent for the session runner, mirroring `subjectAccent()` in the
 * design source. Class strings are written out in full (never interpolated)
 * so Tailwind's scanner can see them.
 */
export interface SessionAccent {
  /** Light accent ink — topic label, live timer numerals. */
  text: string;
  /** Light accent border — outline on the current question's nav dot. */
  lightBorder: string;
  /** Solid accent fill — selected option badge, answered progress segments. */
  solidBg: string;
  /** Solid accent border — selected option outline. */
  solidBorder: string;
  /** 10% accent wash — selected option background, timer pill. */
  softBg: string;
  /** 30% accent border — timer pill outline. */
  tintBorder: string;
  /** Darker accent — the primary "Next" button. */
  buttonBg: string;
}

const MATH_ACCENT: SessionAccent = {
  text: 'text-math-light',
  lightBorder: 'border-math-light',
  solidBg: 'bg-math',
  solidBorder: 'border-math',
  softBg: 'bg-math/10',
  tintBorder: 'border-math/30',
  buttonBg: 'bg-math-button',
};

const READING_ACCENT: SessionAccent = {
  text: 'text-reading-light',
  lightBorder: 'border-reading-light',
  solidBg: 'bg-reading',
  solidBorder: 'border-reading',
  softBg: 'bg-reading/10',
  tintBorder: 'border-reading/30',
  buttonBg: 'bg-reading-button',
};

export function getSessionAccent(section: string | undefined): SessionAccent {
  return section === 'reading_writing' ? READING_ACCENT : MATH_ACCENT;
}

/** `M:SS`, matching `formatClock()` in the design source. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;
}

/** Option letters, in the order the backend keys `question.choices`. */
export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export type OptionLabel = (typeof OPTION_LABELS)[number];
