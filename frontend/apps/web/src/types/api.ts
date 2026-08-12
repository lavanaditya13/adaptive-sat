interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: 'student' | 'parent' | 'tutor';
  email_verified: boolean;
  oauth_provider: 'google' | null;
}

interface ConnectedProvider {
  provider: 'google';
  linked_at: string;
  email: string | null;
}

interface ConnectedProvidersResponse {
  providers: ConnectedProvider[];
  has_password: boolean;
}

interface EstimatedScore {
  estimated_score: number;
  target_score: number;
  points_to_go: number;
  percent_to_goal: number;
}

/**
 * A topic the student is weakest at, as reported by the dashboard.
 *
 * Two ids, deliberately: `topic_id` is the database primary key (stable React
 * key), while `practice_topic_id` is the section-scoped position that
 * POST /practice/start accepts as its `topic_id`. Starting a session needs the
 * latter *and* `section_id`, since the backend resolves the position within
 * whichever section the student currently has selected.
 *
 * The four deep-link fields are null only for a topic with no practisable
 * questions — render the row, just without a start action.
 */
interface WeakTopic {
  topic_id: number;
  display_name: string;
  /** Accuracy over this topic, 0-100. */
  mastery_score: number;
  questions_attempted: number;
  questions_correct: number;
  section: 'math' | 'reading_writing' | null;
  section_id: number | null;
  section_display_name: string | null;
  practice_topic_id: number | null;
}

interface DashboardResponse {
  student: { full_name: string };
  progress: {
    sessions_completed: number;
    questions_answered: number;
    accuracy_percentage: number;
    questions_correct: number;
    accuracy_trend_percentage: number;
    avg_session_minutes: number;
    day_streak: number;
  };
  weak_topics: WeakTopic[];
  sections: Array<{
    section_id: number;
    name: string;
    display_name: string;
    accuracy_percentage: number;
    questions_completed: number;
    topics_count: number;
  }>;
  estimated_score: EstimatedScore;
}

interface PracticeOption {
  mode: 'section' | 'adaptive';
  title: string;
  description: string;
  is_locked: boolean;
  question_count: number;
  unlock_requirement?: {
    required_sessions: number;
    completed_sessions: number;
    remaining_sessions: number;
  };
}

interface SectionContextResponse {
  practice_options: PracticeOption[];
  topics: Array<{
    topic_id: number;
    name: string;
    display_name: string;
  }>;
}

interface Question {
  question_id: number;
  prompt: string;
  choices: Record<'A' | 'B' | 'C' | 'D', string>;
  section: 'math' | 'reading_writing';
  topic_display_name: string;
}

interface StartPracticeResponse {
  status: 'in_progress';
  current_position: number;
  total_questions: number;
  question: Question;
}

interface AnswerResponse {
  saved: boolean;
  answered_position: number;
  remaining_questions: number;
  attempt_id: number;
}

interface UpdateAttemptResponse {
  saved: boolean;
  attempt_id: number;
}

interface AbandonResponse {
  status: 'abandoned';
}

interface QuestionResponse {
  current_position: number;
  total_questions: number;
  question: Question;
}

interface QuestionBreakdownItem {
  question_id: number;
  topic_display_name: string;
  prompt: string;
  choices: Record<'A' | 'B' | 'C' | 'D', string>;
  correct_answer: string;
  selected_answer: string | null;
  is_correct: boolean;
  confidence_level: number | null;
  explanation: string | null;
}

interface CompleteResponse {
  status: 'completed';
  /* Present on every response from a backend that has the results endpoints;
     optional so a summary cached by an older build still type-checks. */
  session_id?: number | null;
  completed_at?: string | null;
  score: {
    correct: number;
    incorrect: number;
    total: number;
    percentage: number;
  };
  adaptive_unlock?: {
    is_unlocked: boolean;
    completed_sessions: number;
    required_sessions: number;
    remaining_sessions: number;
  };
  average_confidence: number | null;
  question_breakdown: QuestionBreakdownItem[];
  section: 'math' | 'reading_writing' | null;
  section_display_name: string | null;
}

interface ApiErrorResponse {
  detail: string;
  [key: string]: unknown;
}

/* Domain -> skill accuracy tree backing the practice drill-down
   (GET /api/v1/practice/skill-tree?section=...). Responds in camelCase. */
interface SkillTreeSkill {
  name: string;
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  mastered: boolean;
}

interface SkillTreeDomain {
  name: string;
  /** 1-based position within the section; what POST /practice/start expects as topic_id. */
  topicId: number;
  topicCode: string;
  accuracy: number;
  questionsAttempted: number;
  questionsCorrect: number;
  mastered: boolean;
  skills: SkillTreeSkill[];
}

interface SkillTreeResponse {
  section: 'math' | 'reading_writing';
  sectionDisplayName: string;
  masteryRule: { accuracy: number; minQuestions: number };
  domains: SkillTreeDomain[];
}

export type {
  User,
  ConnectedProvider,
  ConnectedProvidersResponse,
  EstimatedScore,
  WeakTopic,
  DashboardResponse,
  PracticeOption,
  SectionContextResponse,
  Question,
  StartPracticeResponse,
  AnswerResponse,
  AbandonResponse,
  QuestionResponse,
  QuestionBreakdownItem,
  CompleteResponse,
  UpdateAttemptResponse,
  ApiErrorResponse,
  SkillTreeSkill,
  SkillTreeDomain,
  SkillTreeResponse,
};
