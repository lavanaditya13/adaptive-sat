import { apiClient } from './api-client';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { StudentDashboardResponse } from '../types/api';

export const dashboardService = {
    getStudentDashboard: async (): Promise<StudentDashboardResponse> => {
        const response = await apiClient.get<StudentDashboardResponse>(
            API_ENDPOINTS.STUDENT.DASHBOARD
        );
        return response.data;
    },
};
