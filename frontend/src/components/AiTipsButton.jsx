// Example usage in a component
import { withPremiumOnly } from '@/hocs/withPremiumOnly';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import { Brain } from "lucide-react";

function AiTipsButton({ fetchInsights, loadingAI }) {
  return (
    <Tooltip title="Get AI Tips" placement="top">
      <IconButton
        variant="contained"
        sx={{ shrink: 0 }}
        onClick={fetchInsights}
      >
        {loadingAI ? <CircularProgress size={24} /> : <Brain />}
      </IconButton>
    </Tooltip>
  );
}

export const PremiumAiTipsButton = withPremiumOnly(AiTipsButton);

