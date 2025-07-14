// src/components/StockDetailPopup.tsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, DialogActions, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TechnicalAnalysis from "@/components/tradingView/TechnicalAnalysisTradingView";
import { useNavigate } from "react-router-dom";
import { Paths } from "@/constants/paths";

interface Props {
  open: boolean;
  onClose: () => void;
  symbol: string | null;
  exchange: string | null; // Changed to allow null
  conId: number | null; // Changed to number
}

const StockDetailPopup: React.FC<Props> = ({
  open,
  onClose,
  symbol,
  exchange,
  conId, // Destructured conId
}) => {
  const navigate = useNavigate();
  
  const handleNavigate = () => {
    if(symbol!= null){
      navigate(Paths.protected.app.stock(symbol));
    }
  };
  // This check correctly prevents rendering if the essential symbol is missing
  if (!symbol) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {symbol}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ height: "75vh" }}>
        <TechnicalAnalysis symbol={symbol} mode="dark" />
        {/* {conId && <StockNews conId={conId} />} */}
      </DialogContent>
      {/* Add the actions footer */}
      <DialogActions>
        <Button 
          variant="contained" 
          onClick={handleNavigate}
          endIcon={<ArrowForwardIcon />}
        >
          View Full Page
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockDetailPopup;