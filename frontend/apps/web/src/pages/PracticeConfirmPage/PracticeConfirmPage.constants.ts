import { BookOpen, Layers, Zap, type LucideIcon } from 'lucide-react';
import type { PracticeScope } from '@/components/practice-drilldown';

export const GENERAL_PRACTICE_TITLE = 'General Practice';
export const GENERAL_PRACTICE_SUFFIX = 'Mixed practice across the whole section';
export const FULL_DOMAIN_SUFFIX = 'Full domain test';
export const QUESTIONS_LABEL = 'questions';
export const MINUTES_LABEL = 'min est.';
export const ACCURACY_LABEL = 'your accuracy';
export const NOT_ATTEMPTED_LABEL = 'not attempted';
export const NOT_ATTEMPTED_VALUE = '—';
export const START_LABEL = 'Start Practice';
export const STARTING_LABEL = 'Starting…';
export const BACK_LABEL = 'Back';
export const SUBTITLE_SEPARATOR = ' · ';

/** Mirrors the backend's DEFAULT_PRACTICE_QUESTION_COUNT; `/practice/start`
 *  picks the count, so this is the estimate shown before committing. */
export const DEFAULT_QUESTION_COUNT = 5;
/** Roughly a minute a question, matching the design's `~{count} min est.`. */
export const MINUTES_PER_QUESTION = 1;

export const SCOPE_ICONS: Record<PracticeScope, LucideIcon> = {
  general: Zap,
  domain: Layers,
  skill: BookOpen,
};

export const ENCOURAGEMENT_HIGH = "you're crushing it, keep going!";
export const ENCOURAGEMENT_MID = "room to grow. Let's improve.";
export const ENCOURAGEMENT_LOW = "this is a new challenge. You've got this.";

export function getEncouragement(accuracy: number): string {
  if (accuracy >= 80) {
    return ENCOURAGEMENT_HIGH;
  }

  return accuracy >= 50 ? ENCOURAGEMENT_MID : ENCOURAGEMENT_LOW;
}

export function buildAccuracyLine(accuracy: number): string {
  return `You're at ${accuracy}% here — ${getEncouragement(accuracy)}`;
}
