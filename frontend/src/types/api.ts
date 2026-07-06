// API Contracts - MVP (v1)

export type UserRole = 'student' | 'parent' | 'tutor';

// Standard error shape (every 4xx/5xx)
export interface ApiError {
    error: {
        code: string; // SCREAMING_SNAKE_CASE
        message: string;
        field: string | null;
    };
}

// Standard pagination (any list endpoint)
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        has_more: boolean;
    };
}

// User shape
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string; // ISO 8601 UTC
}

// Linked student shape for parent/tutor
export interface LinkedStudent {
    id: string;
    full_name: string;
}

// 1. Auth

export interface SignupRequest {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
}

export interface AuthResponse {
    user: User;
    access_token: string;
    refresh_token: string;
    expires_in: number; // in seconds
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface RefreshResponse {
    access_token: string;
    expires_in: number;
}

export interface LogoutRequest {
    refresh_token: string;
}

export interface MeResponse {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    linked_students: LinkedStudent[] | null;
    created_at: string;
}

// 2. Student Dashboard & Practice

export interface RecommendedSession {
    id: string;
    topic: string;
    reason: string;
    estimated_minutes: number;
}

export interface RecentSession {
    id: string;
    topic: string;
    completed_at: string; // ISO 8601 UTC
    score: number;
    questions_count: number;
}

export interface StudentDashboardResponse {
    streak_days: number;
    sessions_this_week: number;
    overall_accuracy: number;
    next_recommended_session: RecommendedSession | null;
    recent_sessions: RecentSession[];
}

export interface StartSessionRequest {
    topic_id?: string; // optional - omit to let backend pick
    question_count: number;
}

export interface Question {
    id: string;
    type: 'multiple_choice' | 'free_response' | string;
    prompt: string;
    options?: string[]; // omitted or different shape for free_response
    order: number;
}

export interface StartSessionResponse {
    session_id: string;
    topic: string;
    questions: Question[];
    started_at: string;
}

export interface SubmitAnswerRequest {
    question_id: string;
    selected_option: string;
    time_spent_seconds: number;
}

export interface SubmitAnswerResponse {
    correct: boolean;
    correct_answer: string;
    explanation: string;
}

export interface TopicBreakdown {
    topic: string;
    accuracy: number;
}

export interface CompleteSessionResponse {
    session_id: string;
    score: number;
    correct_count: number;
    total_count: number;
    time_spent_seconds: number;
    topic_breakdown: TopicBreakdown[];
}

export interface QuestionResult {
    id: string;
    prompt: string;
    student_answer: string;
    correct_answer: string;
    correct: boolean;
}

export interface SessionResultsResponse extends CompleteSessionResponse {
    questions: QuestionResult[];
}

export interface WeakTopic {
    topic_id: string;
    topic: string;
    accuracy: number;
    attempts: number;
}

export interface ErrorPattern {
    pattern: string;
    description: string;
    occurrences: number;
}

export interface WeaknessAnalysisResponse {
    weak_topics: WeakTopic[];
    error_patterns: ErrorPattern[];
}

export interface AccuracyTrendPoint {
    date: string; // YYYY-MM-DD
    accuracy: number;
}

export interface ProgressResponse {
    range: string;
    accuracy_trend: AccuracyTrendPoint[];
    topics_mastered: number;
    total_topics: number;
}

// 3. Parent Dashboard

export interface ParentStudentSummaryResponse {
    student: LinkedStudent;
    weekly_improvement: number;
    sessions_this_week: number;
    areas_needing_attention: string[];
}

// 4. Tutor Dashboard

export interface TutorStudentOverviewResponse {
    student: LinkedStudent;
    weak_topics: {
        topic: string;
        accuracy: number;
    }[];
    error_patterns: {
        pattern: string;
        occurrences: number;
    }[];
    recommended_sessions: {
        topic: string;
        reason: string;
    }[];
}
