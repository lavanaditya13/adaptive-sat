'use client';

import React from 'react';
import { Question, SubmitAnswerResponse } from '../../types/api';

interface QuestionCardProps {
    question: Question;
    onSelectOption: (option: string) => void;
    isSubmitting: boolean;
    feedback: {
        selectedOption: string;
        result: SubmitAnswerResponse;
    } | null;
}

export function QuestionCard({ question, onSelectOption, isSubmitting, feedback }: QuestionCardProps) {
    const options = question.options ?? [];
    const isFeedbackMode = feedback !== null;

    const getOptionState = (option: string) => {
        if (!isFeedbackMode) return 'default';
        if (option === feedback.result.correct_answer) return 'correct';
        if (option === feedback.selectedOption && !feedback.result.correct) return 'incorrect';
        return 'dimmed';
    };

    const optionStyles: Record<string, string> = {
        default:
            'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:bg-slate-800/80 hover:border-slate-600 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer',
        correct:
            'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 cursor-default',
        incorrect:
            'bg-red-500/10 border-red-500/40 text-red-300 cursor-default',
        dimmed:
            'bg-slate-900/30 border-slate-800/40 text-slate-500 cursor-default opacity-50',
    };

    const optionIcons: Record<string, React.ReactNode> = {
        correct: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            </div>
        ),
        incorrect: (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
        ),
    };

    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    return (
        <div className="w-full">
            {/* Question prompt */}
            <div className="mb-8">
                <p className="text-lg font-medium text-slate-100 leading-relaxed">
                    {question.prompt}
                </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
                {options.map((option, index) => {
                    const state = getOptionState(option);
                    return (
                        <button
                            key={index}
                            onClick={() => {
                                if (!isFeedbackMode && !isSubmitting) {
                                    onSelectOption(option);
                                }
                            }}
                            disabled={isFeedbackMode || isSubmitting}
                            className={`
                                relative flex items-center gap-4 w-full text-left px-5 py-4 rounded-xl border
                                transition-all duration-200
                                ${optionStyles[state]}
                                ${isSubmitting ? 'opacity-50 cursor-wait' : ''}
                            `}
                        >
                            {/* Letter badge */}
                            <span
                                className={`
                                    flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-colors
                                    ${state === 'correct'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : state === 'incorrect'
                                            ? 'bg-red-500/20 text-red-400'
                                            : state === 'dimmed'
                                                ? 'bg-slate-800/50 text-slate-600'
                                                : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'
                                    }
                                `}
                            >
                                {optionLetters[index]}
                            </span>

                            {/* Option text */}
                            <span className="flex-1 text-sm font-medium">
                                {option}
                            </span>

                            {/* Feedback icon */}
                            {isFeedbackMode && optionIcons[state] && (
                                <span className="animate-in fade-in duration-200">
                                    {optionIcons[state]}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Feedback explanation */}
            {isFeedbackMode && (
                <div className={`
                    mt-6 p-4 rounded-xl border text-sm leading-relaxed animate-in slide-in-from-bottom-2 duration-300
                    ${feedback.result.correct
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                    }
                `}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold">
                            {feedback.result.correct ? '✓ Correct!' : '✗ Not quite'}
                        </span>
                    </div>
                    <p className="text-slate-400">
                        {feedback.result.explanation}
                    </p>
                </div>
            )}
        </div>
    );
}

export function QuestionCardSkeleton() {
    return (
        <div className="w-full">
            <div className="mb-8">
                <div className="h-5 w-full rounded-md bg-slate-800 animate-pulse mb-2" />
                <div className="h-5 w-3/4 rounded-md bg-slate-800 animate-pulse" />
            </div>
            <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border border-slate-800/60 bg-slate-900/40">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-slate-800 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
