// SwitchableHeatMap.tsx
import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import CryptoHeatMap from '@/components/tradingView/CryptoHeatMapTradingView';
import StockHeatMap from '@/components/tradingView/StocksHeatMapTradingView';

interface SwitchableHeatMapProps {
  mode: string;
}

function SwitchableHeatMap({ mode }: SwitchableHeatMapProps) {
  const [showCrypto, setShowCrypto] = useState<boolean>(false);

  return (
    <Box sx={{width: 800, display: 'flex', flexDirection: 'column', gap: 2, margin:'auto' }}>
      <Box sx={{ width: '100%', height: 600,  }}>
        {showCrypto ? <CryptoHeatMap mode={mode} /> : <StockHeatMap mode={mode}/>}
      </Box>
      <Button
        variant="contained"
        onClick={() => setShowCrypto(!showCrypto)}
      >
        Switch to {showCrypto ? 'Stocks' : 'Crypto'}
      </Button>
    </Box>
  );
}

export default SwitchableHeatMap;