import React, { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';

const MobileBlocker = () => {
  const [width, setWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobileView = () => {
      // Update both width and mobile status
      const currentWidth = window.innerWidth;
      setWidth(currentWidth);
      setIsMobile(currentWidth <= 1350);
    };

    // Check initial load
    checkMobileView();

    // Add event listener to check on resize
    window.addEventListener('resize', checkMobileView);

    // Cleanup listener
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  if (isMobile) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 9999,
          color: 'text.primary',
          p: 3
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h4" gutterBottom>
            Mobile View Not Supported
          </Typography>
          <Typography variant="body1" paragraph>
            We're currently optimizing our mobile experience. 
            Please use a desktop or larger screen to access this application.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Current screen width: {width}px
          </Typography>
        </Container>
      </Box>
    );
  }

  return null;
};

export default MobileBlocker;