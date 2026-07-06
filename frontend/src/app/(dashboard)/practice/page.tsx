'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '../../../constants/routes';

export default function PracticePage() {
    const router = useRouter();

    React.useEffect(() => {
        // Redirect to start a new practice session
        router.replace(ROUTES.PRACTICE_SESSION('new'));
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="text-center">
                <div className="relative flex items-center justify-center mb-6">
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-slate-100 mb-1">Starting practice...</h2>
                <p className="text-sm text-slate-500">Preparing your questions</p>
            </div>
        </div>
    );
}
