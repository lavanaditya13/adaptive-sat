import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
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
