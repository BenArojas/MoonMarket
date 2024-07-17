// ErrorPage.js
import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from '@mui/material';

const ErrorPage = () => {
  const error = useRouteError();
  const { clearToken } = useAuth();
  const navigate = useNavigate();

  // Log the error object to the console for debugging


  const handleClick =  () => {
    clearToken(); // Clear the authentication token
    navigate('/login', { replace: true });
  };
  return (
    <div>
      <h1>Error</h1>
      {error?.response?.status === 401 ? <div><p>seems like youre Unauthorized. please click the button to login.</p>  <Button onClick={handleClick}>Reauthorize</Button></div> :   <p>{error?.data || 'An unexpected error occurred.'}</p>}
    </div>
  );
};

export default ErrorPage;
