import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, ButtonGroup, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface OrderPanelProps {
  conid: number | null;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ conid }) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('LMT');
  const [limitPrice, setLimitPrice] = useState('');

  const handlePreview = () => {
    if (!conid || !quantity || (orderType === 'LMT' && !limitPrice)) {
        alert('Please fill out all order details.');
        return;
    }
    const orderDetails = {
        conid,
        side,
        quantity,
        orderType,
        price: orderType === 'LMT' ? parseFloat(limitPrice) : undefined,
        tif: 'DAY',
    };
    console.log("PREVIEW ORDER:", orderDetails);
    // In the next step, we'll replace this with: previewMutation.mutate(orderDetails);
  };

  const handlePlaceOrder = () => {
    console.log("PLACE ORDER clicked. Logic to be added.");
    // This will be enabled after a successful preview.
  };


  return (
    <Paper variant="outlined">
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        Place Order
      </Typography>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ButtonGroup fullWidth>
          <Button variant={side === 'BUY' ? 'contained' : 'outlined'} color="success" onClick={() => setSide('BUY')}>
            Buy
          </Button>
          <Button variant={side === 'SELL' ? 'contained' : 'outlined'} color="error" onClick={() => setSide('SELL')}>
            Sell
          </Button>
        </ButtonGroup>

        <FormControl fullWidth>
          <InputLabel>Order Type</InputLabel>
          <Select value={orderType} label="Order Type" onChange={(e) => setOrderType(e.target.value)}>
            <MenuItem value="MKT">Market</MenuItem>
            <MenuItem value="LMT">Limit</MenuItem>
            <MenuItem value="STP">Stop</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          fullWidth
        />

        {orderType === 'LMT' && (
          <TextField
            label="Limit Price"
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            fullWidth
          />
        )}

        <Button variant="contained" onClick={handlePreview}>
          Preview Order
        </Button>
      </Box>
    </Paper>
  );
};

export default React.memo(OrderPanel);