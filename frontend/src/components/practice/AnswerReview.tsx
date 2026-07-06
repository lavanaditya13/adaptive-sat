'use client';

import React, { useState } from 'react';
import type { QuestionResult } from '../../types/api';

interface AnswerReviewProps {
    questions: QuestionResult[];
}

export function AnswerReview({ questions }: AnswerReviewProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpanded = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="w-full">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Review Your Answers</h3>
            <div className="space-y-2">
                {questions.map((question, index) => {
                    const isExpanded = expandedId === question.id;
                    const isCorrect = question.correct;

                    return (
                        <div
                            key={question.id}
                            className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/40 transition-all duration-200"
                        >
                            <button
                                onClick={() => toggleExpanded(question.id)}
                                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800/40 transition-colors"
                            >
                                {/* Status icon */}
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                                    isCorrect
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-red-500/10 text-red-400'
                                }`}>
                                    {isCorrect ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>

                                {/* Question number and preview */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-semibold text-slate-500">
                                            Q{index + 1}
                                        </span>
                                        <span className={`text-xs font-medium ${
                                            isCorrect ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {isCorrect ? 'Correct' : 'Incorrect'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 truncate">
                                        {question.prompt}
                                    </p>
                                </div>

                                {/* Expand/collapse icon */}
                                <div className="flex-shrink-0 text-slate-500">
                                    <svg
                                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-0 border-t border-slate-800/60 animate-in slide-in-from-top-2 duration-200">
                                    <div className="pt-3 space-y-3">
                                        {/* Your answer */}
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">Your answer</p>
                                            <p className="text-sm text-slate-300">
                                                {question.student_answer}
                                            </p>
                                        </div>

                                        {/* Correct answer (only show if incorrect) */}
                                        {!isCorrect && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1">Correct answer</p>
                                                <p className="text-sm text-emerald-400">
                                                    {question.correct_answer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function AnswerReviewSkeleton() {
    return (
        <div className="w-full">
            <div className="h-4 w-32 rounded-md bg-slate-800 animate-pulse mb-4" />
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border border-slate-800/60 rounded-xl p-4 bg-slate-900/40">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="h-4 w-16 rounded-md bg-slate-800 animate-pulse" />
                                <div className="h-4 w-3/4 rounded-md bg-slate-800 animate-pulse" />
                            </div>
                            <div className="w-5 h-5 rounded-md bg-slate-800 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
