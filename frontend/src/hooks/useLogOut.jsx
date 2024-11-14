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
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['authStatus'] });
      
      // Optimistically update auth status
      const previousAuthData = queryClient.getQueryData(['authStatus']);
      queryClient.setQueryData(['authStatus'], null);
      
      return { previousAuthData };
    },
    onSuccess: () => {
      // Clear all queries after successful logout
      queryClient.clear();
      // Navigate to login
      navigate("/login", { replace: true });
    },
    onError: (err, _, context) => {
      // On error, roll back to the previous value
      queryClient.setQueryData(['authStatus'], context.previousAuthData);
      console.error("Error during logout", err);
    }
  });

  return () => logoutMutation.mutate();
};

export default useLogout;