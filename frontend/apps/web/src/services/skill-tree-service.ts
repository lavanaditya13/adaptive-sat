import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { SectionName } from '@/constants/section-theme';

/**
 * Shared shape of both tree levels. The skill-tree endpoint is the one
 * deliberate camelCase exception in this otherwise snake_case API, because a
 * domain and a skill are the same node with an extra level of nesting.
 */
export interface SkillTreeNode {
  name: string;
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  mastered: boolean;
}

export type SkillTreeSkill = SkillTreeNode;

export interface SkillTreeDomain extends SkillTreeNode {
  /** 1-based position within the section (domains ordered by name) — this is
   *  what `POST /practice/start` accepts as `topic_id`, NOT the Topic PK. */
  topicId: number;
  topicCode: string;
  skills: SkillTreeSkill[];
}

/** Echoed by the backend so the UI states the rule the student is scored by. */
export interface MasteryRule {
  accuracy: number;
  minQuestions: number;
}

export interface SkillTreeResponse {
  section: SectionName;
  sectionDisplayName: string;
  masteryRule: MasteryRule;
  domains: SkillTreeDomain[];
}

const MOCK_MASTERY_RULE: MasteryRule = { accuracy: 85, minQuestions: 10 };

function node(
  name: string,
  questionsAttempted: number,
  questionsCorrect: number
): SkillTreeSkill {
  const accuracy =
    questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0;

  return {
    name,
    accuracy,
    questionsAttempted,
    questionsCorrect,
    mastered:
      questionsAttempted >= MOCK_MASTERY_RULE.minQuestions &&
      accuracy >= MOCK_MASTERY_RULE.accuracy,
  };
}

function domain(
  topicId: number,
  name: string,
  topicCode: string,
  skills: SkillTreeSkill[]
): SkillTreeDomain {
  const questionsAttempted = skills.reduce((total, skill) => total + skill.questionsAttempted, 0);
  const questionsCorrect = skills.reduce((total, skill) => total + skill.questionsCorrect, 0);
  const accuracy =
    questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0;

  return {
    topicId,
    name,
    topicCode,
    accuracy,
    questionsAttempted,
    questionsCorrect,
    mastered:
      questionsAttempted >= MOCK_MASTERY_RULE.minQuestions &&
      accuracy >= MOCK_MASTERY_RULE.accuracy,
    skills,
  };
}

/**
 * Offline stand-in shaped like the real seeded curriculum (4 domains a
 * section, 2–14 skills a domain, several nodes never attempted) rather than
 * like the design mock, so layout problems surface during local development.
 */
const MOCK_SKILL_TREES: Record<SectionName, SkillTreeResponse> = {
  math: {
    section: 'math',
    sectionDisplayName: 'Math',
    masteryRule: MOCK_MASTERY_RULE,
    domains: [
      domain(1, 'Advanced Math', 'ADVANCED_MATH', [
        node('Equivalent expressions', 10, 8),
        node('Nonlinear equations in one variable', 12, 9),
        node('Nonlinear functions', 8, 5),
        node('General', 4, 3),
      ]),
      domain(2, 'Algebra', 'ALGEBRA', [
        node('Linear equations in one variable', 12, 11),
        node('Linear equations in two variables', 9, 7),
        node('Linear functions', 10, 9),
        node('Linear inequalities in one or two variables', 8, 6),
        node('Systems of two linear equations in two variables', 7, 5),
        node('General', 2, 1),
      ]),
      domain(3, 'Geometry and Trigonometry', 'GEOMETRY_TRIGONOMETRY', [
        node('Area and volume', 10, 8),
        node('Circles', 0, 0),
        node('Lines, angles, and triangles', 8, 6),
        node('Right triangles and trigonometry', 6, 4),
        node('General', 0, 0),
      ]),
      domain(4, 'Problem-Solving and Data Analysis', 'PROBLEM_SOLVING_DATA', [
        node('Evaluating statistical claims', 4, 2),
        node('Inference from sample statistics', 5, 3),
        node('One-variable data: distributions and measures of center', 11, 9),
        node('Percentages', 8, 7),
        node('Probability and conditional probability', 6, 4),
        node('Ratios, rates, proportional relationships, and units', 10, 9),
        node('Two-variable data: models and scatterplots', 0, 0),
        node('General', 3, 2),
      ]),
    ],
  },
  reading_writing: {
    section: 'reading_writing',
    sectionDisplayName: 'Reading & Writing',
    masteryRule: MOCK_MASTERY_RULE,
    domains: [
      domain(1, 'Craft and Structure', 'CRAFT_STRUCTURE', [
        node('Cross-text connections', 6, 4),
        node('Text structure and purpose', 12, 8),
        node('Words in context', 14, 10),
        node('General', 2, 1),
      ]),
      domain(2, 'Expression of Ideas', 'EXPRESSION_OF_IDEAS', [
        node('Rhetorical synthesis', 10, 7),
        node('Transitions', 9, 7),
        node('General', 0, 0),
      ]),
      domain(3, 'Information and Ideas', 'INFORMATION_IDEAS', [
        node('Central ideas and details', 11, 9),
        node('Command of evidence: quantitative', 5, 3),
        node('Command of evidence: textual', 8, 6),
        node('Inferences', 9, 6),
        node('General', 0, 0),
      ]),
      domain(4, 'Standard English Conventions', 'STANDARD_ENGLISH_CONVENTIONS', [
        node('Boundaries', 10, 9),
        node('Form, structure, and sense', 12, 10),
        node('General', 0, 0),
      ]),
    ],
  },
};

/**
 * Domain -> skill accuracy tree for one section. `section` is optional on the
 * wire (the backend falls back to the student's last section selection), but
 * every drill-down screen knows its subject from the URL, so we always send it.
 */
export async function getSkillTree(section: SectionName): Promise<SkillTreeResponse> {
  try {
    const response = await apiClient.get<SkillTreeResponse>(API.PRACTICE.SKILL_TREE, {
      params: { section },
    });
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API getSkillTree failed, returning mock fallback tree:', error);
    return MOCK_SKILL_TREES[section];
  }
}

export { MOCK_SKILL_TREES };
