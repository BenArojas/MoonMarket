import axios from 'axios'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Ensure the base URL is properly formed
const baseURL = import.meta.env.VITE_BACKEND_BASE_URL || 'https://moonmaket-backend.azurewebsites.net';

// Log the base URL during development to verify it's correct
if (import.meta.env.DEV) {
}

const apiConfig = {
  baseURL: baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};


const api = axios.create(apiConfig);

export const authCheckApi = axios.create(apiConfig);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if it's already a refresh request or has been retried
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login on refresh failure
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status !== 401) {
      toast.error(error.response.data.detail);
    }

    return Promise.reject(error);
  }
);

export default api;