// src/components/PremiumListItemButton.jsx
import React from 'react';
import { ListItemButton, ListItemIcon } from '@mui/material';
import { withPremiumOnly } from '@/hocs/withPremiumOnly';

// Base ListItemButton component
function BaseListItemButton({ selected, onClick, icon }) {
  return (
    <ListItemButton selected={selected} onClick={onClick}>
      <ListItemIcon sx={{ justifyContent: 'center' }}>
        {icon}
      </ListItemIcon>
    </ListItemButton>
  );
}

// Wrap it with the HOC
export const PremiumListItemButton = withPremiumOnly(BaseListItemButton);