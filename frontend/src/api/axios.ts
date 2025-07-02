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
const API_ERROR_TOAST_ID = "api-error-toast";

export const authCheckApi: AxiosInstance = axios.create(apiConfig);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      const message = (error.response?.data as { detail?: string })?.detail || 'An API error occurred';
      
      // Use a toastId to prevent duplicate toasts
      toast.error(message, {
        toastId: API_ERROR_TOAST_ID,
      });
    }
    return Promise.reject(error);
  }
);

export default api;