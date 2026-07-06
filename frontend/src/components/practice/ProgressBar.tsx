import React from 'react';

interface ProgressBarProps {
    current: number; // 0-indexed current question
    total: number;
    topic?: string | null;
}

export function ProgressBar({ current, total, topic }: ProgressBarProps) {
    const progress = total > 0 ? ((current) / total) * 100 : 0;
    const displayCurrent = Math.min(current + 1, total);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                    {topic && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {topic}
                        </span>
                    )}
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                    Question {displayCurrent} of {total}
                </span>
            </div>

            {/* Track */}
            <div className="relative h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                {/* Filled bar */}
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
                {/* Subtle shimmer on the filled portion */}
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-between mt-2 px-0.5">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`
                            w-1.5 h-1.5 rounded-full transition-all duration-300
                            ${i < current
                                ? 'bg-indigo-500 scale-100'
                                : i === current
                                    ? 'bg-indigo-400 scale-125 shadow-sm shadow-indigo-400/50'
                                    : 'bg-slate-700 scale-100'
                            }
                        `}
                    />
                ))}
            </div>
        </div>
    );
}

export function ProgressBarSkeleton() {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2.5">
                <div className="h-5 w-24 rounded-lg bg-slate-800 animate-pulse" />
                <div className="h-4 w-28 rounded bg-slate-800 animate-pulse" />
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 animate-pulse" />
        </div>
    );
}
