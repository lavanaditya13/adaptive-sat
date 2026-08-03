import type {
  User,
  ConnectedProvidersResponse,
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
  email_verified: false,
  oauth_provider: null,
};

export const MOCK_CONNECTED_PROVIDERS: ConnectedProvidersResponse = {
  providers: [
    { provider: 'google', linked_at: '2026-06-01T12:00:00Z', email: 'student@example.com' },
  ],
  has_password: true,
};

export const MOCK_DASHBOARD: DashboardResponse = {
  student: { full_name: 'Alex Student' },
  progress: {
    sessions_completed: 12,
    questions_answered: 145,
    accuracy_percentage: 78,
    questions_correct: 113,
    accuracy_trend_percentage: 4.2,
    avg_session_minutes: 25,
    day_streak: 14,
  },
  weak_topics: [
    { topic_id: 1, display_name: 'Linear Equations in Two Variables', mastery_score: 45 },
    { topic_id: 2, display_name: 'Problem Solving and Data Analysis', mastery_score: 52 },
    { topic_id: 3, display_name: 'Expression Simplification & Factoring', mastery_score: 60 },
  ],
  sections: [
    {
      section_id: 1,
      name: 'math',
      display_name: 'Math',
      accuracy_percentage: 82,
      questions_completed: 148,
      topics_count: 5,
    },
    {
      section_id: 2,
      name: 'reading_writing',
      display_name: 'Reading & Writing',
      accuracy_percentage: 77,
      questions_completed: 162,
      topics_count: 5,
    },
  ],
  estimated_score: {
    estimated_score: 1420,
    target_score: 1520,
    points_to_go: 100,
    percent_to_goal: 93.4,
  },
};

export const MOCK_SECTION_CONTEXT: SectionContextResponse = {
  practice_options: [
    {
      mode: 'section',
      title: 'Full Section Practice',
      description: 'Practice standard SAT questions across the entire section',
      is_locked: false,
      question_count: 25,
    },
    {
      mode: 'adaptive',
      title: 'Adaptive Test Mode',
      description: 'Personalized adaptive difficulty based on your performance history',
      is_locked: true,
      question_count: 25,
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
    },
    {
      topic_id: 102,
      name: 'advanced_math',
      display_name: 'Advanced Math & Functions',
    },
    {
      topic_id: 103,
      name: 'problem_solving',
      display_name: 'Problem Solving & Data Analysis',
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
    section: 'math' as const,
    topic_display_name: 'Algebra',
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
    section: 'math' as const,
    topic_display_name: 'Algebra',
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
    section: 'math' as const,
    topic_display_name: 'Advanced Math',
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
  average_confidence: 3.3,
  section: 'math',
  section_display_name: 'Math',
  question_breakdown: [
    {
      question_id: 201,
      topic_display_name: 'Algebra',
      prompt: 'If 3x + 7 = 22, what is the value of 6x - 4?',
      choices: { A: '26', B: '30', C: '32', D: '36' },
      correct_answer: 'A',
      selected_answer: 'A',
      is_correct: true,
      confidence_level: 4,
      explanation: 'Solving 3x + 7 = 22 gives x = 5, so 6x - 4 = 6(5) - 4 = 26.',
    },
    {
      question_id: 202,
      topic_display_name: 'Algebra',
      prompt: 'Which of the following equations represents a line parallel to y = 4x - 5?',
      choices: {
        A: 'y = -4x + 2',
        B: 'y = 4x + 10',
        C: 'y = 0.25x - 5',
        D: 'y = -0.25x + 3',
      },
      correct_answer: 'B',
      selected_answer: 'A',
      is_correct: false,
      confidence_level: 2,
      explanation: 'Parallel lines share the same slope. Since the original line has a slope of 4, the parallel line must also have a slope of 4 — only option B matches.',
    },
    {
      question_id: 203,
      topic_display_name: 'Advanced Math',
      prompt: 'A function f is defined by f(x) = x^2 - 3x + 2. What is the value of f(4)?',
      choices: { A: '4', B: '6', C: '8', D: '10' },
      correct_answer: 'B',
      selected_answer: 'B',
      is_correct: true,
      confidence_level: 4,
      explanation: 'f(4) = 4^2 - 3(4) + 2 = 16 - 12 + 2 = 6.',
    },
  ],
};
