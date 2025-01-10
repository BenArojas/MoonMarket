import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import { Box, Card, Stack, Typography, useTheme, Button } from "@mui/material";
import { addUserPurchase, addUserSale } from "@/api/user";
import SharesDialog from "@/components/SharesDialog.jsx";
import { AreaChart } from "@/components/CurrentStockChart.jsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function transformData(historicalData) {
  return historicalData
    .map((item) => ({
      time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
      value: item.close,
    }))
    .sort((a, b) => a.time - b.time); // Sort in ascending order
}

export default function CurrentStockCard({
  stockData,
  stockTicker,
}) {
  const transformedData = transformData(stockData);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient()
  const buyShares = useMutation({
    mutationFn: addUserPurchase,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey:["userData"]}) 
    },
    onError: (error) => {
      console.error("Error posting transaction", error);
    }
  })

  const sellShares = useMutation({
    mutationFn: addUserSale,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey:["userData"]})  
    },
    onError: (error) => {
      console.error("Error posting transaction", error);
    }
  })

  const [dialog, setDialog] = useState({
    title: "",
    text: "",
    labelText: "",
    function: "",
    buttonText: "",
    ticker: stockTicker,

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
      function: "buy",
      buttonText: "Add",
      ticker: stockTicker,
    }));
  };
  const handleSellClick = () => {
    setDialogOpen(true);
    setDialog((prevDialog) => ({
      ...prevDialog,
      title: "Sell shares",
      text: "To sell shares of the stock, please enter how many shares of the stock you sold and at which price.",
      labelText: "Enter sold price",
      function: "sell",
      buttonText: "Sell",
      ticker: stockTicker,
    }));
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 15px",
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
      <AreaChart  data={transformedData} colors={{
            lineColor : '#E1E5EB',
            areaTopColor : '#E1E5EB',
        }} height={260}/>
      {dialogOpen && (
        <SharesDialog
          handleClose={handleClose}
          open={dialogOpen}
          dialog={dialog}
          buyShares={buyShares}
          sellShares={sellShares}
        />
      )}
    </Card>
  );
}
