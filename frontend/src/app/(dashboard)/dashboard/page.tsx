'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { dashboardService } from '../../../services/dashboard-service';
import { QUERY_KEYS } from '../../../constants/query-keys';
import { StatCard, StatCardSkeleton } from '../../../components/dashboard/StatCard';
import {
    RecommendedSessionCard,
    RecommendedSessionCardSkeleton,
    NoRecommendationCard,
} from '../../../components/dashboard/RecommendedSessionCard';
import {
    RecentSessionsList,
    RecentSessionsListSkeleton,
} from '../../../components/dashboard/RecentSessionsList';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const firstName = user?.full_name?.split(' ')[0] || 'Student';

    const { data, isLoading, isError } = useQuery({
        queryKey: QUERY_KEYS.STUDENT_DASHBOARD,
        queryFn: dashboardService.getStudentDashboard,
    });

    return (
        <div className="px-8 py-8 max-w-5xl mx-auto">
            {/* Header: Greeting + Streak */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                        Hey, {firstName} 👋
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Here&rsquo;s your SAT prep overview
                    </p>
                </div>

                {isLoading ? (
                    <div className="h-9 w-32 rounded-xl bg-slate-800 animate-pulse" />
                ) : data ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <span className="text-lg">🔥</span>
                        <span className="text-sm font-bold text-orange-400">
                            {data.streak_days} day streak
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Error state */}
            {isError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-6">
                    Failed to load dashboard data. Please try refreshing the page.
                </div>
            )}

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {isLoading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : data ? (
                    <>
                        <StatCard
                            label="Sessions This Week"
                            value={data.sessions_this_week}
                            accent="from-cyan-500 to-blue-500"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Overall Accuracy"
                            value={`${data.overall_accuracy}%`}
                            accent="from-emerald-500 to-teal-500"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                            }
                        />
                    </>
                ) : null}
            </div>

            {/* Recommended Session */}
            <div className="mb-8">
                <h2 className="text-base font-semibold text-slate-300 mb-3">
                    Next Recommended Session
                </h2>
                {isLoading ? (
                    <RecommendedSessionCardSkeleton />
                ) : data?.next_recommended_session ? (
                    <RecommendedSessionCard session={data.next_recommended_session} />
                ) : (
                    <NoRecommendationCard />
                )}
            </div>

            {/* Recent Sessions */}
            <div>
                <h2 className="text-base font-semibold text-slate-300 mb-3">
                    Recent Sessions
                </h2>
                {isLoading ? (
                    <RecentSessionsListSkeleton />
                ) : data ? (
                    <RecentSessionsList sessions={data.recent_sessions} />
                ) : null}
            </div>
        </div>
    );
}
