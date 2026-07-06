import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent?: string; // tailwind gradient classes
}

export function StatCard({ label, value, icon, accent = 'from-indigo-500 to-violet-500' }: StatCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5 transition-all duration-300 hover:border-slate-700/80 hover:shadow-lg hover:shadow-indigo-500/5">
            {/* Subtle gradient accent line at top */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent} opacity-60 group-hover:opacity-100 transition-opacity`} />

            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {label}
                    </span>
                    <span className="text-2xl font-bold text-slate-50 tracking-tight">
                        {value}
                    </span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/80 text-slate-400 group-hover:text-indigo-400 transition-colors">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800" />
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2.5">
                    <div className="h-3 w-24 rounded-md bg-slate-800 animate-pulse" />
                    <div className="h-7 w-16 rounded-md bg-slate-800 animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse" />
            </div>
        </div>
    );
}
