import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { resolveApiBaseUrl } from '@/constants/environment';
import { mockHandlers } from '@/mocks';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { User } from '@/types/api';
import type { SignupFormData, LoginFormData } from '@/utils/validation-schemas';

export async function signup(data: SignupFormData): Promise<User> {
  const response = await apiClient.post<{ user: User }>(API.AUTH.SIGNUP, data);
  return response.data.user;
}

export async function login(data: LoginFormData): Promise<User> {
  const response = await apiClient.post<{ user: User }>(API.AUTH.LOGIN, {
    ...data,
    role: 'student',
  });
  return response.data.user;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>(API.AUTH.ME);
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post(API.AUTH.LOGOUT);
}

// Full-page redirect target for "Continue with Google/Apple" — not mock-wrapped
// (a real OAuth handshake can't be faked), so this hits the backend directly and
// 404s until SCRUM-22/23 ship. `intent=link` is used by the authenticated
// "add a sign-in method" flow instead of login/signup.
export async function getOAuthStartUrl(
  provider: 'google' | 'apple',
  intent: 'login' | 'signup' | 'link' = 'login'
): Promise<string> {
  const baseUrl = await resolveApiBaseUrl();
  const path = provider === 'google' ? API.AUTH.GOOGLE_START : API.AUTH.APPLE_START;
  return `${baseUrl}${path}?intent=${intent}`;
}

export async function verifyEmail(token: string): Promise<User> {
  try {
    const response = await apiClient.post<{ user: User }>(API.AUTH.VERIFY_EMAIL, { token });
    return response.data.user;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API verifyEmail failed, returning mock fallback response:', error);
    return mockHandlers.verifyEmail(token);
  }
}

export async function resendVerificationEmail(): Promise<void> {
  try {
    await apiClient.post(API.AUTH.RESEND_VERIFICATION);
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API resendVerificationEmail failed, using mock fallback:', error);
    await mockHandlers.resendVerificationEmail();
  }
}
