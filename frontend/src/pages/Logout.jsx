import { useNavigate, redirect } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

const Logout = () => {
  const { clearTokens } = useAuth();

  // Function to handle logout
  const handleLogout = () => {
    clearTokens(); // Clear the authentication token
    redirect("/login", { replace: true }); // Navigate to the home page ("/") with replace option set to true
  };

  setTimeout(() => {
    handleLogout(); // Invoke the logout action
  }, 500);

  return <>Logout Page</>;
};

export default Logout;