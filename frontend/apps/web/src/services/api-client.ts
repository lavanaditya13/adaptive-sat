import axios from 'axios';
import { resolveApiBaseUrl } from '@/constants/environment';

const apiClient = axios.create({
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await resolveApiBaseUrl();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default apiClient;
