import React from 'react';

interface RadioOption {
    label: string;
    value: string;
}

interface RadioGroupProps {
    label: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
    name?: string;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ label, options, value, onChange, error, name }, ref) => {
        return (
            <div ref={ref} className="flex flex-col gap-2 w-full">
                <span className="text-sm font-medium text-slate-300">
                    {label}
                </span>
                <div className="grid grid-cols-3 gap-3">
                    {options.map((option) => {
                        const isSelected = value === option.value;
                        return (
                            <label
                                key={option.value}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition-all duration-200 ${isSelected
                                        ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400 font-semibold'
                                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name={name}
                                    value={option.value}
                                    checked={isSelected}
                                    onChange={() => onChange(option.value)}
                                    className="sr-only"
                                />
                                <span className="text-sm">{option.label}</span>
                            </label>
                        );
                    })}
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

RadioGroup.displayName = 'RadioGroup';
