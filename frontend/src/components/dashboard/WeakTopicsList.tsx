import React from 'react';
import type { WeakTopic } from '../../types/api';

interface WeakTopicsListProps {
    weakTopics: WeakTopic[];
}

export function WeakTopicsList({ weakTopics }: WeakTopicsListProps) {
    if (weakTopics.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-500">No weak topics identified yet. Keep practicing!</p>
            </div>
        );
    }

    // Sort by accuracy (lowest first)
    const sortedTopics = [...weakTopics].sort((a, b) => a.accuracy - b.accuracy);

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 60) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getAccuracyLabel = (accuracy: number) => {
        if (accuracy >= 60) return 'Needs work';
        return 'Weak';
    };

    return (
        <div className="space-y-3">
            {sortedTopics.map((topic, index) => (
                <div
                    key={topic.topic_id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
                >
                    {/* Rank badge */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-400 text-sm font-bold flex-shrink-0">
                        {index + 1}
                    </div>

                    {/* Topic info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-200 truncate">
                                {topic.topic}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 tabular-nums">
                                {topic.accuracy}%
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${getAccuracyColor(topic.accuracy)}`}
                                style={{ width: `${topic.accuracy}%` }}
                            />
                        </div>
                    </div>

                    {/* Attempts count */}
                    <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-slate-500">Attempts</p>
                        <p className="text-sm font-semibold text-slate-300">{topic.attempts}</p>
                    </div>

                    {/* Label */}
                    <div className="flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                            topic.accuracy >= 60
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-red-500/10 text-red-400'
                        }`}>
                            {getAccuracyLabel(topic.accuracy)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function WeakTopicsListSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-32 rounded-md bg-slate-800 animate-pulse" />
                            <div className="h-4 w-12 rounded-md bg-slate-800 animate-pulse" />
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 animate-pulse" />
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                        <div className="h-3 w-12 rounded-md bg-slate-800 animate-pulse" />
                        <div className="h-4 w-8 rounded-md bg-slate-800 animate-pulse" />
                    </div>
                    <div className="h-6 w-16 rounded-md bg-slate-800 animate-pulse" />
                </div>
            ))}
        </div>
    );
}
