import axios from 'axios';
import { useAuthStore } from '../store';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  // Free Render API can take ~30–50s to wake from sleep
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('apexcareir_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary for file uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', false as unknown as string);
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
      delete (config.headers as Record<string, unknown>)['content-type'];
    }
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (!originalRequest || originalRequest._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const response = await axios.post<{ access: string }>(`${apiBaseUrl}/auth/refresh/`, {
        refresh: refreshToken,
      });
      const accessToken = response.data.access;
      localStorage.setItem('apexcareir_access_token', accessToken);
      useAuthStore.setState({ accessToken });
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return httpClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearTokens();
      return Promise.reject(refreshError);
    }
  },
);
