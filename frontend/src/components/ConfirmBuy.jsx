import React from "react";
import { Box, Typography, Button, Dialog, DialogContent, DialogTitle, DialogActions } from "@mui/material";
import "@/styles/portfolio.css";

export default function ConfirmBuyDialog({ 
  open,
  onClose,
  onConfirm,
  ticker, 
  quantity, 
  price,
  commission,
  totalCost 
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Transaction</DialogTitle>
      <DialogContent sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5
      }}>
        <Box sx={{display:'flex', flexDirection:'column', gap: 1}}>
          <Typography>Stock Ticker: {ticker}</Typography>
          <Typography>Quantity Purchased: {quantity}</Typography>
          <Typography>Purchase Price per Share: {price}$</Typography>
          <Typography>Commission paid: {commission}$</Typography>
          <Typography>Total Cost: {totalCost}$</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          Confirm 
        </Button>
      </DialogActions>
    </Dialog>
  );
}