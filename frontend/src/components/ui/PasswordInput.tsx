import React, { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-300">
                    {label}
                </label>
                <div className="relative">
                    <input
                        ref={ref}
                        type={showPassword ? 'text' : 'password'}
                        className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500'
                            } ${className}`}
                        {...props}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                    >
                        {showPassword ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
                {error && (
                    <span className="text-xs font-medium text-red-400 mt-0.5">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';
