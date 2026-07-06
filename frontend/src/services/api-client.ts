import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth-store';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { RefreshResponse } from '../types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach the access token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Flag to prevent multiple concurrent refresh requests
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: string | PromiseLike<string>) => void;
    reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle 401 errors and auto-refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (!originalRequest) {
            return Promise.reject(error);
        }

        // Check if error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't try to refresh if the request was to login/signup/refresh/logout
            const isAuthEndpoint =
                originalRequest.url?.includes(API_ENDPOINTS.AUTH.LOGIN) ||
                originalRequest.url?.includes(API_ENDPOINTS.AUTH.SIGNUP) ||
                originalRequest.url?.includes(API_ENDPOINTS.AUTH.REFRESH) ||
                originalRequest.url?.includes(API_ENDPOINTS.AUTH.LOGOUT);

            if (isAuthEndpoint) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = useAuthStore.getState().refreshToken;
            if (!refreshToken) {
                isRefreshing = false;
                useAuthStore.getState().logout();
                return Promise.reject(error);
            }

            try {
                // Call refresh endpoint directly using axios to avoid interceptor loop
                const response = await axios.post<RefreshResponse>(
                    `${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
                    { refresh_token: refreshToken },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                const { access_token } = response.data;
                useAuthStore.getState().setAccessToken(access_token);

                // Process queue with new token
                processQueue(null, access_token);
                isRefreshing = false;

                // Retry original request
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                }
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                isRefreshing = false;
                useAuthStore.getState().logout();

                // Optionally redirect to login page if window is defined
                if (typeof window !== 'undefined') {
                    window.location.href = API_ENDPOINTS.AUTH.LOGIN;
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

