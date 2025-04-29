import { withPremiumOnly } from '@/hocs/withPremiumOnly';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import { Brain } from "lucide-react";
import React from 'react';

interface AiTipsButtonProps {
  fetchInsights: () => void;
  loadingAI: boolean;
}

const AiTipsButton: React.FC<AiTipsButtonProps> = ({ fetchInsights, loadingAI }) => {
  return (
    <Tooltip title="Get AI Tips" placement="top">
      <IconButton
        sx={{ shrink: 0 }}
        onClick={fetchInsights}
      >
        {loadingAI ? <CircularProgress size={24} /> : <Brain />}
      </IconButton>
    </Tooltip>
  );
};

export const PremiumAiTipsButton = withPremiumOnly(AiTipsButton); 