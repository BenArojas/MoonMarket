import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';

const Logout = () => {
  const { clearTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      clearTokens(); // Clear the authentication token
      navigate("/login", { replace: true }); // Navigate to the login page with replace option set to true
    };

    handleLogout(); // Invoke the logout action
  }, [clearTokens, navigate]); // Dependency array to avoid unnecessary re-renders

  return <>Logging out...</>; // Provide a better user experience with some feedback
};

export default Logout;
