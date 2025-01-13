import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "@/api/axios";


const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: async ()=> await api.post('/auth/logout'),
    onSuccess: () => {
      navigate("/login", { replace: true });
      // Clear all queries after successful logout
      queryClient.clear();
      
    },
    onError: (err) => {
      console.error("Error during logout", err);
    }
  });

  return () => logoutMutation.mutate();
};

export default useLogout;