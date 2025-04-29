import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "@/api/axios";

const useLogout = (): () => void => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post('/auth/logout');
    },
    onSuccess: (): void => {
      navigate("/login", { replace: true });
      queryClient.clear();
    },
    onError: (err: Error): void => {
      console.error("Error during logout", err);
    }
  });

  return () => logoutMutation.mutate();
};

export default useLogout;