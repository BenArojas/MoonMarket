// src/hocs/withPremiumOnly.jsx
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Tooltip, IconButton } from '@mui/material';
import { EyeOff  } from "lucide-react";


export function withPremiumOnly(WrappedComponent) {
  return function PremiumOnlyComponent(props) {
    const user = useUser();

    if (user?.account_type !== 'premium') {
      return (
        <Tooltip
          title="Want to use more features? Upgrade your account at Profile page"
          placement="top"
        >
          {/* Wrap in <span> because Tooltip requires a non-disabled child */}
          <span>
            <IconButton
              variant="contained"
              sx={{ shrink: 0 }}
              disabled
            >
              <EyeOff  />
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    return <WrappedComponent {...props} />;
  };
}