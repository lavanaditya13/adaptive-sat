import React from 'react';
import Link from 'next/link';
import LoginForm from '../../../components/auth/LoginForm';
import { ROUTES } from '../../../constants/routes';

export default function LoginPage() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950 px-4 py-12 relative overflow-hidden">
            {/* Decorative background glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-[440px] z-10">
                {/* Logo/Brand */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                        <span className="text-xl font-bold text-white">A</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Welcome Back!</h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Ready to level up your SAT prep today?
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-xl shadow-black/20">
                    <LoginForm />

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Don't have an account?{' '}
                        <Link
                            href={ROUTES.SIGNUP}
                            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
