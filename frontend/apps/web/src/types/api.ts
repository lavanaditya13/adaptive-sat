interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: 'student' | 'parent' | 'tutor';
}

interface DashboardResponse {
  student: { full_name: string };
  progress: {
    sessions_completed: number;
    questions_answered: number;
    accuracy_percentage: number;
  };
  weak_topics: Array<{
    topic_id: number;
    display_name: string;
    mastery_score: number;
  }>;
  sections: Array<{
    section_id: number;
    name: string;
    display_name: string;
  }>;
}

interface PracticeOption {
  mode: 'section' | 'adaptive';
  title: string;
  description: string;
  is_locked: boolean;
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
    action: string;
  }>;
}

interface Question {
  question_id: number;
  prompt: string;
  choices: Record<'A' | 'B' | 'C' | 'D', string>;
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
}

interface QuestionResponse {
  current_position: number;
  total_questions: number;
  question: Question;
}

interface CompleteResponse {
  status: 'completed';
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
}

interface ApiErrorResponse {
  detail: string;
  [key: string]: unknown;
}

export type {
  User,
  DashboardResponse,
  PracticeOption,
  SectionContextResponse,
  Question,
  StartPracticeResponse,
  AnswerResponse,
  QuestionResponse,
  CompleteResponse,
  ApiErrorResponse,
};
