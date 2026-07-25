import axios from 'axios';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth-store';

const apiClient = axios.create({
  baseURL: 'http://ream-scenic-outsell.ngrok-free.dev/',
  withCredentials: true,
});


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearUser();
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.LOGIN;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
