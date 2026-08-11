export const INDIVIDUAL_SKILLS_LABEL = 'Individual Skills';
export const START_SKILL_LABEL = 'Start';
export const EMPTY_SKILLS_MESSAGE = 'This domain has no tagged skills yet.';
export const MISSING_DOMAIN_TOAST = 'That domain is no longer available.';

export function buildFullDomainTestLabel(domainName: string): string {
  return `Start full ${domainName} test`;
}

export function buildSkillsCountLabel(skillCount: number): string {
  return skillCount === 1 ? '1 skill' : `${skillCount} skills`;
}

export function buildSummaryLabel(skillCount: number, questionsAttempted: number): string {
  const attempted =
    questionsAttempted > 0 ? `${questionsAttempted} questions attempted` : 'not started yet';

  return `${buildSkillsCountLabel(skillCount)} · ${attempted}`;
}
