// src/pages/ProfilePage.tsx
import React from 'react';
import { Box, Divider, Typography, GlobalStyles } from '@mui/material';
import { ProfileTabs } from '@/components/ProfileTabs';

// Define the custom CSS for the underline effect using GlobalStyles
const customStyles = (
  <GlobalStyles
    styles={`
      .underline-effect {
        position: relative;
        text-decoration: none;
        display: inline-block;
      }
      .underline-effect::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background-color: currentColor; /* Uses the Typography color */
        transition: width 0.3s ease-in-out;
      }
      .underline-effect:hover::after {
        width: 100%;
      }
    `}
  />
);


export const ProfilePage = () => {
  return (
    <>
      {customStyles}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 4, // Vertical padding
          px: 2, // Horizontal padding
        }}
      >
        <div className="heading-text">
          <Typography
            variant="h4"
            color="primary"
            sx={{
              textAlign: 'center',
              margin: 'auto',
              cursor: 'pointer',
              width: '200px',
              letterSpacing: '-3px',
              fontWeight: 'bold',
            }}
            className="underline-effect"
          >
            ACCOUNT
          </Typography>
        </div>

        <Divider sx={{ width: '80%', my: 4 }} />

        <ProfileTabs />
      </Box>
    </>
  );
};

export default ProfilePage;