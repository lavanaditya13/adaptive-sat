import type { AxiosError } from 'axios';

type ApiErrorResponse = {
  detail?: string;
};

export function getApiErrorDetail(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

export function shouldUseMockFallback(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return true;
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;

  return !status || status >= 500;
}