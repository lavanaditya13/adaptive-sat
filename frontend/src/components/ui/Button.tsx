import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, isLoading, disabled, variant = 'primary', className = '', ...props }, ref) => {
        const baseStyles =
            'flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/10 focus:ring-offset-slate-900',
            secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 focus:ring-offset-slate-900',
            outline: 'border border-slate-700 hover:bg-slate-900 text-slate-300 focus:ring-offset-slate-900',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${variants[variant]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Loading...
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
