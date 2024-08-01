import "@/styles/portfolio.css";
import { Box, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import React from "react";


export default function ConfirmBuyDialog({ setisBought,open,ticker, quantity, price, totalCost }) {

  return (
    <React.Fragment>
      <Dialog open={open} onClose={()=> setisBought(false)}>
        <DialogTitle>Transaction Details:</DialogTitle>
        <DialogContent className="addStockForm">
          <Box sx={{display:'flex', flexDirection:'column'}}>
            <Typography>Stock Ticker: {ticker}</Typography>
            <Typography>Quantity Purchased: {quantity}</Typography>
            <Typography>Purchase Price per Share: {price}</Typography>
            <Typography>Total Cost: {totalCost}</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
