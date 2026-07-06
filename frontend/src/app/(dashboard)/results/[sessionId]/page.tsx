'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { practiceService } from '../../../../services/practice-service';
import { dashboardService } from '../../../../services/dashboard-service';
import { QUERY_KEYS } from '../../../../constants/query-keys';
import { ROUTES } from '../../../../constants/routes';
import { TopicBreakdown, TopicBreakdownSkeleton } from '../../../../components/dashboard/TopicBreakdown';
import { AnswerReview, AnswerReviewSkeleton } from '../../../../components/practice/AnswerReview';

export default function ResultsPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;

    const { data: results, isLoading: isLoadingResults, isError: isResultsError } = useQuery({
        queryKey: QUERY_KEYS.SESSION_RESULTS(sessionId),
        queryFn: () => practiceService.getSessionResults(sessionId),
    });

    const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
        queryKey: QUERY_KEYS.STUDENT_DASHBOARD,
        queryFn: dashboardService.getStudentDashboard,
    });

    const isLoading = isLoadingResults || isLoadingDashboard;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-100 mb-1">Loading results...</h2>
                    <p className="text-sm text-slate-500">Calculating your performance</p>
                </div>
            </div>
        );
    }

    if (isResultsError || !results) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="w-full max-w-md text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Results not found</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        We couldn't load your session results. It may have expired or there was an error.
                    </p>
                    <button
                        onClick={() => router.push(ROUTES.DASHBOARD)}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const percentage = Math.round((results.correct_count / results.total_count) * 100);
    const timeSpentMinutes = Math.round(results.time_spent_seconds / 60);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="w-full border-b border-slate-800/50">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.push(ROUTES.DASHBOARD)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span className="font-medium">Back to Dashboard</span>
                    </button>

                    <span className="text-sm font-semibold text-slate-300">Session Results</span>

                    <div className="w-20" /> {/* Spacer for balance */}
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto px-6 py-8">
                {/* Score header */}
                <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center mb-4">
                            <div className={`text-5xl font-bold tracking-tight ${
                                percentage >= 80
                                    ? 'text-emerald-400'
                                    : percentage >= 60
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                            }`}>
                                {percentage}%
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-50 mb-2">
                            {results.correct_count} of {results.total_count} correct
                        </h1>
                        <p className="text-sm text-slate-500">
                            Completed in {timeSpentMinutes} {timeSpentMinutes === 1 ? 'minute' : 'minutes'}
                        </p>
                    </div>
                </div>

                {/* Topic breakdown */}
                <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
                        {isLoadingDashboard ? (
                            <TopicBreakdownSkeleton />
                        ) : (
                            <TopicBreakdown breakdowns={results.topic_breakdown} />
                        )}
                    </div>
                </div>

                {/* Answer review */}
                <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
                        {isLoadingDashboard ? (
                            <AnswerReviewSkeleton />
                        ) : (
                            <AnswerReview questions={results.questions} />
                        )}
                    </div>
                </div>

                {/* CTAs */}
                <div className="w-full flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    {dashboard?.next_recommended_session ? (
                        <button
                            onClick={() => router.push(ROUTES.PRACTICE_SESSION(dashboard.next_recommended_session!.id))}
                            className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                            Continue to next recommended session
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push(ROUTES.PRACTICE)}
                            className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Start new practice session
                        </button>
                    )}
                    <button
                        onClick={() => router.push(ROUTES.DASHBOARD)}
                        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </main>

            {/* Bottom safe area */}
            <div className="h-8" />
        </div>
    );
}
