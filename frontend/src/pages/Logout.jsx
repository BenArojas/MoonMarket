import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useQueryClient } from "@tanstack/react-query";


const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient()


  useEffect(() => {
    const handleLogout = () => {
      queryClient.clear()
      logout(); // Clear the authentication 
      navigate("/login", { replace: true }); // Navigate to the login page with replace option set to true
    };

    handleLogout(); // Invoke the logout action
  }, []); 
  return <>Logging out...</>; // Provide a better user experience with some feedback
};

export default Logout;
