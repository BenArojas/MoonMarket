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
  return data;                               // return entire object
};

export const logout = async () => {
  const response = await authCheckApi.post("/auth/logout");
  return response.data.message;
};