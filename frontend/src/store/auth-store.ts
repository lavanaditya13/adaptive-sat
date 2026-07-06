import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    login: (user: User, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    setUser: (user: User | null) => void;
    setAccessToken: (token: string | null) => void;
    setRefreshToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            login: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),

            setUser: (user) => set({ user }),

            setAccessToken: (accessToken) =>
                set((state) => ({
                    accessToken,
                    isAuthenticated: !!accessToken,
                })),

            setRefreshToken: (refreshToken) => set({ refreshToken }),
        }),
        {
            name: 'auth-storage',
            // Only persist the refreshToken in localStorage
            partialize: (state) => ({
                refreshToken: state.refreshToken,
            }),
        }
    )
);
