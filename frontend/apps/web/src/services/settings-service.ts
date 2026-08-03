import apiClient from './api-client';
import { API } from '@/constants/api-endpoints';
import { mockHandlers } from '@/mocks';
import { shouldUseMockFallback } from '@/utils/api-errors';
import type { ConnectedProvidersResponse } from '@/types/api';

export async function getConnectedProviders(): Promise<ConnectedProvidersResponse> {
  try {
    const response = await apiClient.get<ConnectedProvidersResponse>(
      API.SETTINGS.CONNECTED_PROVIDERS
    );
    return response.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API getConnectedProviders failed, returning mock fallback response:', error);
    return mockHandlers.getConnectedProviders();
  }
}

export async function unlinkProvider(provider: 'google' | 'apple'): Promise<void> {
  try {
    await apiClient.delete(API.SETTINGS.UNLINK_PROVIDER(provider));
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    console.warn('API unlinkProvider failed, using mock fallback:', error);
    await mockHandlers.unlinkProvider(provider);
  }
}
