// SwitchableHeatMap.jsx
import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import CryptoHeatMap from '@/components/CryptoHeatMapTradingView';
import StockHeatMap from '@/components/StocksHeatMapTradingView';

function SwitchableHeatMap() {
  const [showCrypto, setShowCrypto] = useState(false);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Button 
        variant="contained" 
        onClick={() => setShowCrypto(!showCrypto)}
        sx={{ mb: 2 }}
      >
        Switch to {showCrypto ? 'Stocks' : 'Crypto'}
      </Button>
      <Box sx={{ flexGrow: 1 }}>
        {showCrypto ? <CryptoHeatMap /> : <StockHeatMap />}
      </Box>
    </Box>
  );
}

export default SwitchableHeatMap;