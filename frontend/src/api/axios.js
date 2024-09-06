  import axios from 'axios'
  import { toast } from 'react-toastify';
  import 'react-toastify/dist/ReactToastify.css';

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
          // Handle refresh failure (e.g., logout user)
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