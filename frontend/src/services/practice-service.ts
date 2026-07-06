import { apiClient } from './api-client';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
    StartSessionRequest,
    StartSessionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    CompleteSessionResponse,
    SessionResultsResponse,
} from '../types/api';

export const practiceService = {
    startSession: async (data: StartSessionRequest): Promise<StartSessionResponse> => {
        const response = await apiClient.post<StartSessionResponse>(
            API_ENDPOINTS.STUDENT.SESSIONS,
            data
        );
        return response.data;
    },

    submitAnswer: async (
        sessionId: string,
        data: SubmitAnswerRequest
    ): Promise<SubmitAnswerResponse> => {
        const response = await apiClient.post<SubmitAnswerResponse>(
            API_ENDPOINTS.STUDENT.ANSWERS(sessionId),
            data
        );
        return response.data;
    },

    completeSession: async (sessionId: string): Promise<CompleteSessionResponse> => {
        const response = await apiClient.post<CompleteSessionResponse>(
            API_ENDPOINTS.STUDENT.COMPLETE(sessionId)
        );
        return response.data;
    },

    getSessionResults: async (sessionId: string): Promise<SessionResultsResponse> => {
        const response = await apiClient.get<SessionResultsResponse>(
            API_ENDPOINTS.STUDENT.RESULTS(sessionId)
        );
        return response.data;
    },
};
