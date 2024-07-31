import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import { Box, Card, Stack, Typography, useTheme, Button } from "@mui/material";
import { getHistoricalData } from "@/api/stock";
import { addUserPurchase, addUserSale } from "@/api/user";
import { transactionSchema } from "@/schemas/transaction";
import { zodResolver } from "@hookform/resolvers/zod";
import SharesDialog from "@/components/SharesDialog.jsx";
import { CurrentStockChart } from "@/components/CurrentStockChart.jsx";

function transformData(historicalData) {
  return historicalData
    .map((item) => ({
      time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
      value: item.close,
    }))
    .sort((a, b) => a.time - b.time); // Sort in ascending order
}

export default function CurrentStockCard({
  props,
  stockData,
  stockTicker,
  token,
}) {
  const transformedData = transformData(stockData);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [dialog, setDialog] = useState({
    title: "",
    text: "",
    labelText: "",
    function: "",
    buttonText: "",
    ticker: stockTicker,
    token: token,
  });

  function handleClose() {
    setDialogOpen(false);
  }

  const handleBuyClick = () => {
    setDialogOpen(true);
    setDialog((prevDialog) => ({
      ...prevDialog,
      title: "Add shares",
      text: "To add shares of the stock, please enter how many shares of the stock you bought and at which price.",
      labelText: "Enter bought price",
      function: addUserPurchase,
      buttonText: "Add",
    }));
  };
  const handleSellClick = () => {
    setDialogOpen(true);
    setDialog((prevDialog) => ({
      ...prevDialog,
      title: "Sell shares",
      text: "To sell shares of the stock, please enter how many shares of the stock you sold and at which price.",
      labelText: "Enter sold price",
      function: addUserSale,
      buttonText: "Sell",
    }));
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        margin: "auto",
        padding: "10px 15px",
        backgroundColor: "transparent",
      }}
    >
      <Box
        className="stats"
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          p: 1,
          gap: 6,
        }}
      >
        <Typography variant="h5">{stockTicker}</Typography>
        <Box sx={{ display: "flex", gap: 2, ml: "auto" }}>
          <Button variant="contained" color="error" onClick={handleSellClick}>
            Sell
          </Button>
          <Button variant="contained" onClick={handleBuyClick}>
            Buy
          </Button>
        </Box>
      </Box>
      <CurrentStockChart {...props} data={transformedData}></CurrentStockChart>
      {dialogOpen && (
        <SharesDialog
          handleClose={handleClose}
          open={dialogOpen}
          dialog={dialog}
          addUserPurchase={addUserPurchase}
          addUserSale={addUserSale}
        />
      )}
    </Card>
  );
}
