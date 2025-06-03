import api, { authCheckApi } from "@/api/axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export const fetchAuthStatus = async () => {
  const response = await authCheckApi.get("/auth/status");
  if (response.data.authenticated === false) {
    toast.error(response.data.message);
  }
  return response.data.authenticated;
};

export const logout = async () => {
  const response = await authCheckApi.post("/auth/logout");
  return response.data.message;
};