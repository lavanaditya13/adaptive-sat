'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth-store';
import { ROUTES } from '../../constants/routes';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    roles?: string[]; // If set, only show for these roles
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: ROUTES.DASHBOARD,
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        label: 'Practice',
        href: ROUTES.PRACTICE,
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
        ),
    },
    {
        label: 'Progress',
        href: ROUTES.RESULTS,
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
    },
];

export default function SidebarNav() {
    const pathname = usePathname();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const userRole = user?.role;

    const filteredItems = navItems.filter((item) => {
        if (!item.roles) return true;
        return userRole && item.roles.includes(userRole);
    });

    const firstName = user?.full_name?.split(' ')[0] || 'Student';

    return (
        <aside className="flex flex-col w-[260px] min-h-screen bg-slate-950 border-r border-slate-800/60 px-4 py-6">
            {/* Brand */}
            <div className="flex items-center gap-3 px-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-base font-bold text-white">A</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-50 tracking-tight">Adaptive SAT</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Prep Platform</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                ${isActive
                                    ? 'bg-indigo-600/15 text-indigo-400 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                                }
                            `}
                        >
                            <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                            {item.label}
                            {isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User section at bottom */}
            <div className="mt-auto pt-4 border-t border-slate-800/60">
                <div className="flex items-center gap-3 px-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">{firstName[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate">{firstName}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 capitalize">{userRole || 'student'}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
