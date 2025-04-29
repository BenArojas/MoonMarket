// src/hocs/withPremiumOnly.jsx
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Tooltip, IconButton } from '@mui/material';
import { EyeOff } from "lucide-react";

type WithPremiumOnlyProps = {
  [key: string]: any;
};

export function withPremiumOnly<P extends WithPremiumOnlyProps>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  return function PremiumOnlyComponent(props: P) {
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
              sx={{ shrink: 0 }}
              disabled
            >
              <EyeOff />
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    return <WrappedComponent {...props} />;
  };
}