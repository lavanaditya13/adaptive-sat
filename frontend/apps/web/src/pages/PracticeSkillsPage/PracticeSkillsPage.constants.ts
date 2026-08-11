export const SKILLS_SECTION_LABEL = 'Individual Skills';
export const START_SKILL_LABEL = 'Start';
export const START_ERROR_MESSAGE = 'Could not start practice. Please try again.';
export const NOT_FOUND_TITLE = 'Domain not found';
export const NOT_FOUND_DESCRIPTION = "This domain isn't in your practice data yet.";

export function buildFullTestLabel(domainName: string): string {
  return `Start full ${domainName} test`;
}

export function buildScopeNote(domainName: string): string {
  return `Practice sessions run a full topic — starting a skill below practices all of ${domainName}, not just this skill.`;
}
