import { apiClient } from './api-client';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import type {
    WeaknessAnalysisResponse,
    ProgressResponse,
} from '../types/api';

export const progressService = {
    getWeaknessAnalysis: async (): Promise<WeaknessAnalysisResponse> => {
        const response = await apiClient.get<WeaknessAnalysisResponse>(
            API_ENDPOINTS.STUDENT.WEAKNESS_ANALYSIS
        );
        return response.data;
    },

    getProgress: async (range: string = '30d'): Promise<ProgressResponse> => {
        const response = await apiClient.get<ProgressResponse>(
            `${API_ENDPOINTS.STUDENT.PROGRESS}?range=${range}`
        );
        return response.data;
    },
};
