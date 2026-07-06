import React from 'react';
import Link from 'next/link';
import { RecentSession } from '../../types/api';
import { ROUTES } from '../../constants/routes';

interface RecentSessionsListProps {
    sessions: RecentSession[];
}

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
}

function getScoreBg(score: number): string {
    if (score >= 80) return 'bg-emerald-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
}

export function RecentSessionsList({ sessions }: RecentSessionsListProps) {
    if (sessions.length === 0) {
        return (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 text-slate-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    </div>
                    <p className="text-sm text-slate-500">No sessions yet. Start your first practice!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden">
            <div className="divide-y divide-slate-800/60">
                {sessions.map((session) => (
                    <Link
                        key={session.id}
                        href={ROUTES.SESSION_RESULTS(session.id)}
                        className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors group"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Score badge */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${getScoreBg(session.score)} flex-shrink-0`}>
                                <span className={`text-sm font-bold ${getScoreColor(session.score)}`}>
                                    {session.score}%
                                </span>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-slate-50 transition-colors">
                                    {session.topic}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {session.questions_count} questions · {formatDate(session.completed_at)}
                                </p>
                            </div>
                        </div>

                        <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function RecentSessionsListSkeleton() {
    return (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden">
            <div className="divide-y divide-slate-800/60">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse" />
                            <div className="flex flex-col gap-1.5">
                                <div className="h-4 w-36 rounded-md bg-slate-800 animate-pulse" />
                                <div className="h-3 w-24 rounded-md bg-slate-800 animate-pulse" />
                            </div>
                        </div>
                        <div className="w-4 h-4 rounded bg-slate-800 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
