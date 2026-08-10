/**
 * Shapes for `GET /api/v1/practice/skill-tree`.
 *
 * This endpoint is a deliberate camelCase exception to the otherwise
 * snake_case API, so these fields are intentionally not snake_case.
 */

export interface SkillTreeSkill {
  name: string;
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  mastered: boolean;
}

export interface SkillTreeDomain {
  name: string;
  /** 1-based position within the section — what `POST /practice/start` takes as `topic_id`. */
  topicId: number;
  topicCode: string;
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  mastered: boolean;
  skills: SkillTreeSkill[];
}

export interface SkillTreeResponse {
  section: string;
  sectionDisplayName: string;
  masteryRule: {
    accuracy: number;
    minQuestions: number;
  };
  domains: SkillTreeDomain[];
}

/**
 * Router state handed to the confirm screen when a mode card is started.
 * The confirm screen re-reads the authoritative option list itself; this only
 * carries the user's choice across the navigation.
 */
export interface PracticeConfirmNavState {
  mode: 'section' | 'adaptive' | 'topic';
  sectionId: number;
  subject: string;
  title: string;
  questionCount: number;
}
