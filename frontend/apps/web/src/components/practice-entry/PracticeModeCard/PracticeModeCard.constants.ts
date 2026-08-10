import { Lock, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import type { PracticeOption } from '@/types/api';

type PracticeMode = PracticeOption['mode'];

export const MODE_TITLES: Record<PracticeMode, string> = {
  section: 'General Practice',
  adaptive: 'Adaptive Practice',
};

export const MODE_ICONS: Record<PracticeMode, LucideIcon> = {
  section: Zap,
  adaptive: Sparkles,
};

export const LOCK_ICON = Lock;

export const START_LABEL = 'Start Practice';
export const START_ADAPTIVE_LABEL = 'Start Adaptive Practice';
export const LOCKED_LABEL = 'Locked';
export const ACCURACY_BADGE_SUFFIX = '% accuracy';
export const NO_ATTEMPTS_BADGE = 'No questions yet';
export const QUESTION_COUNT_SUFFIX = ' questions';

export function getModeDescription(mode: PracticeMode, domainsCount: number): string {
  if (mode === 'adaptive') {
    return 'Questions drawn from your weakest areas, re-targeted as your accuracy changes.';
  }

  if (domainsCount > 0) {
    return `Mixed questions from all ${domainsCount} domains. Great for a full review.`;
  }

  return 'Mixed questions from across the whole section. Great for a full review.';
}

/** Honest, server-derived unlock copy — never a hardcoded session count. */
export function getUnlockMessage(remaining: number, required: number): string {
  if (remaining <= 0) {
    return `Unlocked after ${required} section sessions.`;
  }

  const sessionWord = remaining === 1 ? 'session' : 'sessions';

  return `Complete ${remaining} more general ${sessionWord} to unlock adaptive practice.`;
}
