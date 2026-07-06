import React from 'react';
import type { TopicBreakdown } from '../../types/api';

interface TopicBreakdownProps {
    breakdowns: TopicBreakdown[];
}

export function TopicBreakdown({ breakdowns }: TopicBreakdownProps) {
    if (breakdowns.length === 0) {
        return null;
    }

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 80) return 'bg-emerald-500';
        if (accuracy >= 60) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getAccuracyLabel = (accuracy: number) => {
        if (accuracy >= 80) return 'Strong';
        if (accuracy >= 60) return 'Needs work';
        return 'Weak';
    };

    return (
        <div className="w-full">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Topic Breakdown</h3>
            <div className="space-y-3">
                {breakdowns.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-slate-200 truncate">
                                    {item.topic}
                                </span>
                                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                                    {item.accuracy}%
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getAccuracyColor(item.accuracy)}`}
                                    style={{ width: `${item.accuracy}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                                item.accuracy >= 80
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : item.accuracy >= 60
                                        ? 'bg-amber-500/10 text-amber-400'
                                        : 'bg-red-500/10 text-red-400'
                            }`}>
                                {getAccuracyLabel(item.accuracy)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TopicBreakdownSkeleton() {
    return (
        <div className="w-full">
            <div className="h-4 w-32 rounded-md bg-slate-800 animate-pulse mb-4" />
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="h-4 w-48 rounded-md bg-slate-800 animate-pulse" />
                                <div className="h-4 w-12 rounded-md bg-slate-800 animate-pulse" />
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 animate-pulse" />
                        </div>
                        <div className="h-6 w-16 rounded-md bg-slate-800 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
