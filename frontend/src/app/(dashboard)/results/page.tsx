'use client';

import React from 'react';
import Link from 'next/link';
import { ROUTES } from '../../../constants/routes';

export default function ResultsPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto mb-4">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">No session selected</h2>
                <p className="text-sm text-slate-400 mb-6">
                    Please select a specific session to view results, or go to the dashboard to see your recent sessions.
                </p>
                <Link
                    href={ROUTES.DASHBOARD}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
