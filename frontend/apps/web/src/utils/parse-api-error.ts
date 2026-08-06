import type { AxiosError } from 'axios';

type ApiErrorResponse = {
  detail?: string | { message?: string; code?: string };
};

function extractDetail(detail: ApiErrorResponse['detail']): string | null {
  if (!detail) {
    return null;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) {
      return detail.message;
    }

    if (typeof detail.code === 'string' && detail.code.trim()) {
      return detail.code;
    }
  }

  return null;
}

export function parseApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const detail = extractDetail(axiosError.response?.data?.detail);

    if (detail) {
      return detail;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
