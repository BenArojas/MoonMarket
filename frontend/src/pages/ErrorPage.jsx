// ErrorPage.js
import React, {useEffect} from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthProvider";

const ErrorPage = () => {
  const error = useRouteError();
  const { clears } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clears(); // Clear the authentication 
    navigate("/login", { replace: true }); // Navigate to the login page with replace option set to true
  };

  useEffect(() => {
    if(error?.response?.status === 401 ){
      handleLogout(); // Invoke the logout action
    }
  }, [clears, navigate, error]); // Dependency array to avoid unnecessary re-renders

  return (
    <div>
      <h1>Error</h1>
      {error?.data }
    </div>
  );
};

export default ErrorPage;
