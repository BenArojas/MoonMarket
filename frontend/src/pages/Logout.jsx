import { useNavigate, redirect } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

const Logout = () => {
  const { clearToken } = useAuth();

  // Function to handle logout
  const handleLogout = () => {
    clearToken(); // Clear the authentication token
    redirect("/login", { replace: true }); // Navigate to the home page ("/") with replace option set to true
  };

  // Automatically logout after 3 seconds
  setTimeout(() => {
    handleLogout(); // Invoke the logout action
  }, 1000);

  return <>Logout Page</>;
};

export default Logout;