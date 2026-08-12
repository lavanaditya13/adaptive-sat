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

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  math: 'Math',
  reading_writing: 'Reading & Writing',
};

export function getSectionDisplayName(sectionName: string | undefined): string {
  if (!sectionName) {
    return '';
  }

  return SECTION_DISPLAY_NAMES[sectionName] ?? sectionName;
}

/* Mirrors SECTION_CODES in backend/app/services/practice_service.py. The practice
   routes carry the section *name* (`/practice/math`), but POST /practice/context/section
   takes the numeric id, so a URL-driven page has no other way to register its section. */
const SECTION_IDS: Record<SectionName, number> = {
  math: 1,
  reading_writing: 2,
};

export function getSectionId(sectionName: string | undefined): number | null {
  if (!sectionName) {
    return null;
  }

  return SECTION_IDS[sectionName as SectionName] ?? null;
}

export function isSectionName(value: string | undefined): value is SectionName {
  return value === 'math' || value === 'reading_writing';
}
