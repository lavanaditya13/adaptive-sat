'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { AccuracyTrendPoint } from '../../types/api';

interface AccuracyTrendChartProps {
    data: AccuracyTrendPoint[];
}

export function AccuracyTrendChart({ data }: AccuracyTrendChartProps) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-slate-500">No data available for this time range</p>
            </div>
        );
    }

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '8px 12px',
                        }}
                        itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                        formatter={(value: any) => [`${value}%`, 'Accuracy']}
                        labelFormatter={(label: any) => formatDate(label)}
                    />
                    <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function AccuracyTrendChartSkeleton() {
    return (
        <div className="w-full h-64 flex items-center justify-center">
            <div className="w-full h-full rounded-lg bg-slate-800/40 animate-pulse" />
        </div>
    );
}
