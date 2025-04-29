import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ApiConfig extends AxiosRequestConfig {
  baseURL: string;
  withCredentials: boolean;
  headers: {
    'Content-Type': string;
  };
}

const apiConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

const api: AxiosInstance = axios.create(apiConfig);

export const authCheckApi: AxiosInstance = axios.create(apiConfig);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // const originalRequest = error.config;
    // if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
    //   originalRequest._retry = true;

    //   try {
    //     await api.post('/auth/refresh');
    //     return api(originalRequest);
    //   } catch (refreshError) {
    //     // Redirect to login on refresh failure
    //     window.location.href = '/login';
    //     return Promise.reject(refreshError);
    //   }
    // }
    if (error.response?.status !== 401) {
      toast.error((error.response?.data as { detail?: string })?.detail || 'An error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;