import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-300">
                    {label}
                </label>
                <input
                    ref={ref}
                    className={`px-3.5 py-2.5 bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500'
                        } ${className}`}
                    {...props}
                />
                {error && (
                    <span className="text-xs font-medium text-red-400 mt-0.5">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

TextInput.displayName = 'TextInput';
