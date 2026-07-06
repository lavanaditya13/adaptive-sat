import { apiClient } from './api-client';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
    SignupRequest,
    AuthResponse,
    LoginRequest,
    RefreshResponse,
    LogoutRequest,
    MeResponse,
} from '../types/api';

export const authService = {
    signup: async (data: SignupRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>(
            API_ENDPOINTS.AUTH.SIGNUP,
            data
        );
        return response.data;
    },

    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            data
        );
        return response.data;
    },

    refresh: async (refreshToken: string): Promise<RefreshResponse> => {
        // Note: We use apiClient directly here, but during refresh we want to make sure we don't trigger the interceptor.
        // The interceptor already handles bypassing auth endpoints, but we can also pass a custom header or use axios directly if needed.
        // Since the interceptor checks originalRequest.url against API_ENDPOINTS.AUTH.REFRESH, it is safe to use apiClient.
        const response = await apiClient.post<RefreshResponse>(
            API_ENDPOINTS.AUTH.REFRESH,
            { refresh_token: refreshToken }
        );
        return response.data;
    },

    logout: async (refreshToken: string): Promise<void> => {
        await apiClient.post<void>(API_ENDPOINTS.AUTH.LOGOUT, {
            refresh_token: refreshToken,
        } as LogoutRequest);
    },

    me: async (): Promise<MeResponse> => {
        const response = await apiClient.get<MeResponse>(API_ENDPOINTS.AUTH.ME);
        return response.data;
    },
};
