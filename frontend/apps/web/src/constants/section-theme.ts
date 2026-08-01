import { BookOpen, Calculator, type LucideIcon } from 'lucide-react';

export type SectionName = 'math' | 'reading_writing';

interface SectionTheme {
  icon: LucideIcon;
  text: string;
  bgSoft: string;
  border: string;
  bgSolid: string;
  fgSolid: string;
}

const DEFAULT_THEME: SectionTheme = {
  icon: Calculator,
  text: 'text-accent-math',
  bgSoft: 'bg-accent-math/10',
  border: 'border-accent-math/30',
  bgSolid: 'bg-accent-math',
  fgSolid: 'text-accent-math-foreground',
};

const SECTION_THEMES: Record<SectionName, SectionTheme> = {
  math: DEFAULT_THEME,
  reading_writing: {
    icon: BookOpen,
    text: 'text-accent-reading',
    bgSoft: 'bg-accent-reading/10',
    border: 'border-accent-reading/30',
    bgSolid: 'bg-accent-reading',
    fgSolid: 'text-accent-reading-foreground',
  },
};

export function getSectionTheme(sectionName: string): SectionTheme {
  return SECTION_THEMES[sectionName as SectionName] ?? DEFAULT_THEME;
}
