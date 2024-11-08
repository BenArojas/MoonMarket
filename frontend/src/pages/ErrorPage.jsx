import React, { useEffect } from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthProvider";
import { Box, Typography, Button } from '@mui/material';

const ErrorPage = () => {
  const error = useRouteError();
  const { clears } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clears();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (error?.response?.status === 401) {
      handleLogout();
    }
  }, [clears, navigate, error]);

  const getErrorMessage = () => {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (error?.response?.data) {
      return JSON.stringify(error.response.data);
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unknown error occurred';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Error
      </Typography>
      <Typography variant="body1" gutterBottom>
        {getErrorMessage()}
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
        Go to Home
      </Button>
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 4, p: 2,  borderRadius: 1, maxWidth: '80%', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Debug Information:
          </Typography>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
};

export default ErrorPage;