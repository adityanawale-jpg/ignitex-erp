import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { loadingState } from './loadingState';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Base URL for static file assets (uploads). In production set VITE_UPLOADS_BASE_URL
// to the API server origin, e.g. http://35.253.45.137:5000
const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE_URL || '').replace(/\/$/, '');

export const getFileUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
  return `${UPLOADS_BASE}${path}`;
};

/**
 * Create axios instance with base configuration
 */
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - inject API key and token, track in-flight count
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      loadingState.increment();
      const token = localStorage.getItem('erp_token');

      // Inject token into request body for POST/PUT
      if (config.method === 'post' || config.method === 'put') {
        config.data = {
          token: token || '',
          ...config.data,
        };
      }

      // Also set as headers
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        config.headers['x-auth-token'] = token;
      }

      return config;
    },
    (error) => {
      loadingState.decrement();
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle 401 / 429, always decrement counter
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      loadingState.decrement();
      return response;
    },
    (error) => {
      loadingState.decrement();
      if (error.response?.status === 401) {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (error.response?.status === 429) {
        error.message = 'Too many requests. Please wait a moment and try again.';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiService = createApiInstance();

/**
 * Common API helper - uses the dynamic method system
 */
export const dynamicApi = {
  get: (method: string, params: Record<string, unknown> = {}, paging?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiService.post('/common/get', { method, params, ...paging }),

  post: (method: string, params: Record<string, unknown> = {}, body: Record<string, unknown> = {}) =>
    apiService.post('/common/post', { method, params, body }),

  put: (method: string, params: Record<string, unknown> = {}, body: Record<string, unknown> = {}) =>
    apiService.put('/common/put', { method, params, body }),

  delete: (method: string, params: Record<string, unknown> = {}) =>
    apiService.delete('/common/delete', { data: { method, params } }),

  execute: (method: string, params: Record<string, unknown> = {}) =>
    apiService.post('/common/execute', { method, params }),
};

export default apiService;
