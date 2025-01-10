import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

const useLogout = () => {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear all queries after successful logout
      queryClient.clear();
      // Navigate to login
      navigate("/login", { replace: true });
    },
    onError: (err) => {
      console.error("Error during logout", err);
    }
  });

  return () => logoutMutation.mutate();
};

export default useLogout;