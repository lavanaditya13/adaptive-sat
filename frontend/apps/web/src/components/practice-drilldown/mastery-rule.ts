import type { MasteryRule } from '@/services/skill-tree-service';

export const MASTERY_RULE_PREFIX = 'Mastered at ';

/**
 * The rule is echoed by the API rather than hardcoded, so the screen always
 * states the threshold the student is actually being scored against.
 */
export function buildMasteryRuleLabel(rule: MasteryRule): string {
  return `${MASTERY_RULE_PREFIX}${rule.accuracy}%+ accuracy over ${rule.minQuestions}+ questions`;
}
