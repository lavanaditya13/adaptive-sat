'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePracticeSessionStore } from '../../../../store/practice-session-store';
import { practiceService } from '../../../../services/practice-service';
import { ROUTES } from '../../../../constants/routes';
import { useNavigationGuard } from '../../../../hooks/use-navigation-guard';
import { ProgressBar, ProgressBarSkeleton } from '../../../../components/practice/ProgressBar';
import { QuestionCard, QuestionCardSkeleton } from '../../../../components/practice/QuestionCard';

export default function PracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;
    const initCalled = useRef(false);

    const {
        questions,
        topic,
        currentIndex,
        phase,
        feedback,
        questionStartTime,
        error,
        initSession,
        setPhase,
        selectAnswer,
        advanceQuestion,
        setError,
        reset,
    } = usePracticeSessionStore();

    const currentQuestion = questions[currentIndex] ?? null;
    const totalQuestions = questions.length;
    const isLastQuestion = currentIndex >= totalQuestions - 1;

    // Guard navigation while actively answering
    const isInProgress = phase === 'answering' || phase === 'submitting' || phase === 'feedback';
    useNavigationGuard(isInProgress);

    // Fetch session data on mount
    useEffect(() => {
        if (initCalled.current) return;
        initCalled.current = true;

        const loadSession = async () => {
            try {
                setPhase('loading');
                // Start a new session via service
                const response = await practiceService.startSession({
                    topic_id: sessionId !== 'new' ? sessionId : undefined,
                    question_count: 10,
                });

                // If the URL was /practice/new, redirect to the real session ID
                if (sessionId === 'new' || sessionId !== response.session_id) {
                    router.replace(ROUTES.PRACTICE_SESSION(response.session_id));
                }

                initSession(
                    response.session_id,
                    response.topic,
                    response.questions,
                    response.started_at
                );
            } catch (err) {
                console.error('Failed to start session:', err);
                setError('Failed to start practice session. Please try again.');
            }
        };

        loadSession();

        return () => {
            // Clean up store on unmount
            reset();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle answer selection
    const handleSelectOption = useCallback(
        async (selectedOption: string) => {
            if (!currentQuestion || phase !== 'answering') return;

            const timeSpentSeconds = Math.round((Date.now() - questionStartTime) / 1000);

            setPhase('submitting');

            try {
                const result = await practiceService.submitAnswer(sessionId, {
                    question_id: currentQuestion.id,
                    selected_option: selectedOption,
                    time_spent_seconds: timeSpentSeconds,
                });

                selectAnswer(selectedOption, result);

                // Auto-advance after 1.5s feedback display
                setTimeout(async () => {
                    if (isLastQuestion) {
                        // Complete session
                        setPhase('completing');
                        try {
                            await practiceService.completeSession(sessionId);
                            router.push(ROUTES.SESSION_RESULTS(sessionId));
                        } catch (err) {
                            console.error('Failed to complete session:', err);
                            setError('Failed to complete session. Please try again.');
                        }
                    } else {
                        advanceQuestion();
                    }
                }, 1500);
            } catch (err) {
                console.error('Failed to submit answer:', err);
                setError('Failed to submit answer. Please try again.');
            }
        },
        [
            currentQuestion,
            phase,
            questionStartTime,
            sessionId,
            isLastQuestion,
            setPhase,
            selectAnswer,
            advanceQuestion,
            setError,
            router,
        ]
    );

    // Loading state
    if (phase === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col">
                <div className="w-full max-w-2xl mx-auto px-6 py-8">
                    {/* Top bar skeleton */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="h-8 w-8 rounded-lg bg-slate-800 animate-pulse" />
                        <div className="h-5 w-32 rounded-lg bg-slate-800 animate-pulse" />
                    </div>
                    <ProgressBarSkeleton />
                    <div className="mt-12">
                        <QuestionCardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (phase === 'error') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="w-full max-w-md text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
                    <p className="text-sm text-slate-400 mb-6">{error}</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => router.push(ROUTES.DASHBOARD)}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Completing state
    if (phase === 'completing') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-100 mb-1">Wrapping up...</h2>
                    <p className="text-sm text-slate-500">Calculating your results</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Minimal top bar */}
            <header className="w-full border-b border-slate-800/50">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (isInProgress) {
                                const confirmed = window.confirm(
                                    'Leave practice? Your progress on this question won\'t be saved.'
                                );
                                if (!confirmed) return;
                            }
                            reset();
                            router.push(ROUTES.DASHBOARD);
                        }}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="font-medium">Exit</span>
                    </button>

                    {topic && (
                        <span className="text-sm font-semibold text-slate-300">{topic}</span>
                    )}

                    <span className="text-xs font-medium text-slate-600 tabular-nums">
                        {currentIndex + 1}/{totalQuestions}
                    </span>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center w-full max-w-2xl mx-auto px-6 py-8">
                {/* Progress bar */}
                <div className="w-full mb-12">
                    <ProgressBar
                        current={currentIndex}
                        total={totalQuestions}
                    />
                </div>

                {/* Question */}
                {currentQuestion && (
                    <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <QuestionCard
                            question={currentQuestion}
                            onSelectOption={handleSelectOption}
                            isSubmitting={phase === 'submitting'}
                            feedback={feedback}
                        />
                    </div>
                )}
            </main>

            {/* Bottom safe area */}
            <div className="h-8" />
        </div>
    );
}
