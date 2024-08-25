import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      logout(); // Clear the authentication 
      navigate("/login", { replace: true }); // Navigate to the login page with replace option set to true
    };

    handleLogout(); // Invoke the logout action
  }, []); 
  return <>Logging out...</>; // Provide a better user experience with some feedback
};

export default Logout;
