import React from 'react';
import Link from 'next/link';
import { RecommendedSession } from '../../types/api';
import { ROUTES } from '../../constants/routes';

interface RecommendedSessionCardProps {
    session: RecommendedSession;
}

export function RecommendedSessionCard({ session }: RecommendedSessionCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-slate-900/80 to-violet-600/10 border border-indigo-500/20 p-6 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10">
            {/* Decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-colors" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        Next Recommended
                    </span>
                </div>

                <h3 className="text-xl font-bold text-slate-50 mb-1.5 tracking-tight">
                    {session.topic}
                </h3>

                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                    {session.reason}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>~{session.estimated_minutes} min</span>
                    </div>

                    <Link
                        href={ROUTES.PRACTICE_SESSION(session.id)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-200 shadow-sm shadow-indigo-600/20 hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                        Start Practice
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export function RecommendedSessionCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-slate-800 animate-pulse" />
                <div className="h-3 w-32 rounded-md bg-slate-800 animate-pulse" />
            </div>
            <div className="h-6 w-48 rounded-md bg-slate-800 animate-pulse mb-2" />
            <div className="h-4 w-full rounded-md bg-slate-800 animate-pulse mb-1.5" />
            <div className="h-4 w-3/4 rounded-md bg-slate-800 animate-pulse mb-5" />
            <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded-md bg-slate-800 animate-pulse" />
                <div className="h-10 w-32 rounded-xl bg-slate-800 animate-pulse" />
            </div>
        </div>
    );
}

export function NoRecommendationCard() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/60 p-6 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">You&rsquo;re all caught up!</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                    No new recommendations right now. Check back later or start a free practice session.
                </p>
                <Link
                    href="/practice"
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all duration-200"
                >
                    Free Practice
                </Link>
            </div>
        </div>
    );
}
