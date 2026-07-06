import { AxiosError } from 'axios';
import { ApiError } from '../types/api';

export interface ParsedApiError {
    code: string;
    message: string;
    field: string | null;
}

export function parseApiError(error: unknown): ParsedApiError {
    // Check if it is an Axios error
    if (error && typeof error === 'object' && (error as AxiosError).isAxiosError) {
        const axiosError = error as AxiosError<ApiError>;
        const apiError = axiosError.response?.data?.error;
        if (apiError) {
            return {
                code: apiError.code,
                message: apiError.message,
                field: apiError.field,
            };
        }
    }

    // Fallback for standard JS errors or unknown shapes
    return {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        field: null,
    };
}
