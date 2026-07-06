// Simple token store for managing JWTs in the frontend

let inMemoryAccessToken: string | null = null;

export const tokenStore = {
    getAccessToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return inMemoryAccessToken || localStorage.getItem('access_token');
    },

    setAccessToken: (token: string | null) => {
        inMemoryAccessToken = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('access_token', token);
            } else {
                localStorage.removeItem('access_token');
            }
        }
    },

    getRefreshToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('refresh_token');
    },

    setRefreshToken: (token: string | null) => {
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('refresh_token', token);
            } else {
                localStorage.removeItem('refresh_token');
            }
        }
    },

    clearTokens: () => {
        inMemoryAccessToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }
};
