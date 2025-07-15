import api, { authCheckApi } from "@/api/axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export interface AuthDTO {
  authenticated: boolean
  websocket_ready: boolean
  message: string
}

export const fetchAuthStatus = async () => {
  const { data } = await authCheckApi.get<AuthDTO>("/auth/status");
  if (!data.authenticated) toast.error(data.message);
  return data;                               
};


export const disconnectWebSocket = async (): Promise<void> => {
  // Assuming you have a configured axios instance named 'api'
  await api.post("/ws/disconnect");
};

export const logout = async () => {
  return await api.post("/auth/logout")
}