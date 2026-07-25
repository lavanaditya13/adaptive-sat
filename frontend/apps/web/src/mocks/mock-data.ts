import type {
  User,
  DashboardResponse,
  SectionContextResponse,
  StartPracticeResponse,
  AnswerResponse,
  QuestionResponse,
  CompleteResponse,
} from '@/types/api';

export const MOCK_USER: User = {
  user_id: 1,
  email: 'student@example.com',
  full_name: 'Alex Student',
  role: 'student',
};

export const MOCK_DASHBOARD: DashboardResponse = {
  student: { full_name: 'Alex Student' },
  progress: {
    sessions_completed: 12,
    questions_answered: 145,
    accuracy_percentage: 78,
  },
  weak_topics: [
    { topic_id: 1, display_name: 'Linear Equations in Two Variables', mastery_score: 45 },
    { topic_id: 2, display_name: 'Problem Solving and Data Analysis', mastery_score: 52 },
    { topic_id: 3, display_name: 'Expression Simplification & Factoring', mastery_score: 60 },
  ],
  sections: [
    { section_id: 1, name: 'math', display_name: 'Math' },
    { section_id: 2, name: 'reading_writing', display_name: 'Reading & Writing' },
  ],
};

export const MOCK_SECTION_CONTEXT: SectionContextResponse = {
  practice_options: [
    {
      mode: 'section',
      title: 'Full Section Practice',
      description: 'Practice standard SAT questions across the entire section',
      is_locked: false,
    },
    {
      mode: 'adaptive',
      title: 'Adaptive Test Mode',
      description: 'Personalized adaptive difficulty based on your performance history',
      is_locked: true,
      unlock_requirement: {
        required_sessions: 3,
        completed_sessions: 1,
        remaining_sessions: 2,
      },
    },
  ],
  topics: [
    {
      topic_id: 101,
      name: 'algebra',
      display_name: 'Algebra & Linear Equations',
      action: 'practice',
    },
    {
      topic_id: 102,
      name: 'advanced_math',
      display_name: 'Advanced Math & Functions',
      action: 'practice',
    },
    {
      topic_id: 103,
      name: 'problem_solving',
      display_name: 'Problem Solving & Data Analysis',
      action: 'practice',
    },
  ],
};

export const MOCK_QUESTIONS = [
  {
    question_id: 201,
    prompt: 'If 3x + 7 = 22, what is the value of 6x - 4?',
    choices: {
      A: '26',
      B: '30',
      C: '32',
      D: '36',
    },
  },
  {
    question_id: 202,
    prompt: 'Which of the following equations represents a line parallel to y = 4x - 5?',
    choices: {
      A: 'y = -4x + 2',
      B: 'y = 4x + 10',
      C: 'y = 0.25x - 5',
      D: 'y = -0.25x + 3',
    },
  },
  {
    question_id: 203,
    prompt: 'A function f is defined by f(x) = x^2 - 3x + 2. What is the value of f(4)?',
    choices: {
      A: '4',
      B: '6',
      C: '8',
      D: '10',
    },
  },
];

export const MOCK_START_PRACTICE: StartPracticeResponse = {
  status: 'in_progress',
  current_position: 1,
  total_questions: 3,
  question: MOCK_QUESTIONS[0],
};

export const MOCK_ANSWER_RESPONSE: AnswerResponse = {
  saved: true,
  answered_position: 1,
  remaining_questions: 2,
};

export const MOCK_QUESTION_RESPONSE: QuestionResponse = {
  current_position: 1,
  total_questions: 3,
  question: MOCK_QUESTIONS[0],
};

export const MOCK_COMPLETE_RESPONSE: CompleteResponse = {
  status: 'completed',
  score: {
    correct: 2,
    incorrect: 1,
    total: 3,
    percentage: 67,
  },
  adaptive_unlock: {
    is_unlocked: true,
    completed_sessions: 3,
    required_sessions: 3,
    remaining_sessions: 0,
  },
};
