'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { progressService } from '../../../services/progress-service';
import { QUERY_KEYS } from '../../../constants/query-keys';
import { WeakTopicsList, WeakTopicsListSkeleton } from '../../../components/dashboard/WeakTopicsList';
import { AccuracyTrendChart, AccuracyTrendChartSkeleton } from '../../../components/dashboard/AccuracyTrendChart';

type Range = '7d' | '30d' | '90d';

export default function ProgressPage() {
    const [range, setRange] = useState<Range>('30d');

    const { data: weaknessData, isLoading: isLoadingWeakness, isError: isWeaknessError } = useQuery({
        queryKey: QUERY_KEYS.STUDENT_WEAKNESS,
        queryFn: progressService.getWeaknessAnalysis,
    });

    const { data: progressData, isLoading: isLoadingProgress, isError: isProgressError } = useQuery({
        queryKey: [...QUERY_KEYS.STUDENT_PROGRESS, range],
        queryFn: () => progressService.getProgress(range),
    });

    const ranges: { value: Range; label: string }[] = [
        { value: '7d', label: '7 days' },
        { value: '30d', label: '30 days' },
        { value: '90d', label: '90 days' },
    ];

    return (
        <div className="px-8 py-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-50 tracking-tight mb-2">
                    Your Progress
                </h1>
                <p className="text-sm text-slate-500">
                    Track your improvement and identify areas to focus on
                </p>
            </div>

            {/* Topics Mastered Summary */}
            <div className="mb-8">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600/20 via-slate-900/80 to-violet-600/10 border border-indigo-500/20 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400 mb-1">Topics Mastered</p>
                            <p className="text-3xl font-bold text-slate-50 tracking-tight">
                                {progressData?.topics_mastered ?? 0} of {progressData?.total_topics ?? 0}
                            </p>
                        </div>
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accuracy Trend Chart */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-300">Accuracy Trend</h2>
                    {/* Range Toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/60 border border-slate-700/60">
                        {ranges.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setRange(r.value)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    range === r.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
                    {isProgressError ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-red-400">Failed to load progress data</p>
                        </div>
                    ) : isLoadingProgress ? (
                        <AccuracyTrendChartSkeleton />
                    ) : progressData ? (
                        <AccuracyTrendChart data={progressData.accuracy_trend} />
                    ) : null}
                </div>
            </div>

            {/* Weakness Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weak Topics */}
                <div>
                    <h2 className="text-base font-semibold text-slate-300 mb-4">Weak Topics</h2>
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
                        {isWeaknessError ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-red-400">Failed to load weakness data</p>
                            </div>
                        ) : isLoadingWeakness ? (
                            <WeakTopicsListSkeleton />
                        ) : weaknessData ? (
                            <WeakTopicsList weakTopics={weaknessData.weak_topics} />
                        ) : null}
                    </div>
                </div>

                {/* Error Patterns */}
                <div>
                    <h2 className="text-base font-semibold text-slate-300 mb-4">Error Patterns</h2>
                    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
                        {isWeaknessError ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-red-400">Failed to load error patterns</p>
                            </div>
                        ) : isLoadingWeakness ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                                        <div className="h-4 w-3/4 rounded-md bg-slate-700 animate-pulse mb-2" />
                                        <div className="h-3 w-12 rounded-md bg-slate-700 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : weaknessData && weaknessData.error_patterns.length > 0 ? (
                            <div className="space-y-3">
                                {weaknessData.error_patterns.map((pattern, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40"
                                    >
                                        <div className="flex items-start justify-between mb-1.5">
                                            <p className="text-sm font-medium text-slate-200">
                                                {pattern.pattern}
                                            </p>
                                            <span className="text-xs font-semibold text-slate-400 tabular-nums">
                                                {pattern.occurrences}x
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {pattern.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto mb-3">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-500">No error patterns identified yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
