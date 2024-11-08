import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";


const useLogout = () => {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear the query cache
      queryClient.clear();

      // Execute the logout function
      await logout();

      // Redirect to the login page
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error during logout", error);
      // Optionally, you can handle the error here, such as showing a notification
    }
  };

  return handleLogout;
};

export default useLogout;