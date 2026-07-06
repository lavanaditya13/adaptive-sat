'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { authService } from '../services/auth-service';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const { refreshToken, login, logout } = useAuthStore();

    useEffect(() => {
        const bootstrapAuth = async () => {
            // If there is no refresh token, we don't need to bootstrap
            if (!refreshToken) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Refresh the access token
                const refreshData = await authService.refresh(refreshToken);

                // 2. Fetch user profile using the new access token
                // We temporarily set the access token in the store so the me() request attaches it
                useAuthStore.getState().setAccessToken(refreshData.access_token);

                const userData = await authService.me();

                // 3. Update the store with user and tokens
                login(userData, refreshData.access_token, refreshToken);
            } catch (error) {
                console.error('Failed to bootstrap auth session:', error);
                // Clear tokens if bootstrapping fails (e.g. expired refresh token)
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        bootstrapAuth();
    }, [refreshToken, login, logout]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-50 z-50">
                <div className="relative flex items-center justify-center">
                    {/* Outer glowing ring */}
                    <div className="absolute w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                    {/* Inner ring spinning opposite */}
                    <div className="absolute w-10 h-10 rounded-full border-4 border-violet-500/10 border-b-violet-400 animate-spin [animation-duration:1.5s] [animation-direction:reverse]"></div>
                </div>
                <p className="mt-8 text-sm font-medium tracking-wider text-slate-400 animate-pulse">
                    LOADING YOUR SESSION...
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
