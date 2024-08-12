import { getHistoricalData, getStockData } from "@/api/stock";
import { addStockToPortfolio } from "@/api/user";
import CandleStickChart from "@/components/CandleSticksChart";
import ConfirmBuyDialog from "@/components/ConfirmBuy.jsx";
import { useAuth } from "@/contexts/AuthProvider";
import { transactionSchema } from "@/schemas/transaction";
import "@/styles/App.css";
import "@/styles/global.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useLoaderData } from "react-router-dom";
import SearchBar from "@/components/SearchBar.jsx";

export async function loader(ticker, token) {
  const stock = await getStockData(ticker, token);
  const historicaldata = await getHistoricalData(ticker, token);
  return { stock, historicaldata };
}
function StockItem() {
  const { token } = useAuth();
  const {
    stock,
    historicaldata: { historical, symbol },
  } = useLoaderData();

  const [isBought, setisBought] = useState(false);
  const [price, setPrice] = useState(stock?.price.toFixed(2));
  const [quantity, setQuantity] = useState(0);
  const totalPrice = (parseFloat(price) || 0) * (parseFloat(quantity) || 0);

  const handleInputChange = (setter) => (event) => {
    const value = event.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      price: stock?.price.toFixed(2),
    },
    resolver: zodResolver(transactionSchema),
    criteriaMode: "all",
  });

  const queryClient = useQueryClient();
  const { mutateAsync: addStockMutation } = useMutation({
    mutationFn: ({ portfolioStock, price, quantity, token }) =>
      addStockToPortfolio(portfolioStock, price, quantity, token),
    onSuccess: () => {
      queryClient.invalidateQueries(["userData"]) // Invalidate the dailyTimeFrame query when the snapshot is posted
    },
  });

  const onSubmit = async (data) => {
    try {
      const portfolioStock = {
        name: stock.name,
        ticker: symbol,
        price: stock.price,
      };
      // Only include earnings if it's not null
      if (stock.earningsAnnouncement !== null) {
        portfolioStock.earnings = stock.earningsAnnouncement;
      }
      await addStockMutation({
        portfolioStock,
        price: data.price,
        quantity: data.quantity,
        token,
      });
      setisBought(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const [age, setAge] = React.useState("");

  const handleChange = (event) => {
    setAge(event.target.value);
  };

  return (
    stock === null ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems:'center' }}>
        <SearchBar />
        <Typography>Didn't find the ticker you submitted. please try another ticker</Typography>
      </Box>
    ) : (
      <Box
        className="layoutContainer"
        sx={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: 5,
          margin: "auto",
          width: "80%",
        }}
      >
        <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
          <Typography variant="h4">{symbol}</Typography>
          <Box sx={{ shrink: 0 }}>
            <Typography variant="overline" color="GrayText">Last Price</Typography>
            <Typography variant="body2">{stock?.price}</Typography>
          </Box>
          <Box sx={{ shrink: 0 }}>
            <Typography variant="overline" color="GrayText">Volume</Typography>
            <Typography variant="body2">{stock?.volume.toLocaleString("en-US")}</Typography>
          </Box>
          <Box sx={{ shrink: 0 }}>
            <Typography variant="overline" color="GrayText">High (24h)</Typography>
            <Typography variant="body2">{stock?.dayHigh}</Typography>
          </Box>
          <Box sx={{ shrink: 0 }}>
            <Typography variant="overline" color="GrayText">Low (24h)</Typography>
            <Typography variant="body2">{stock?.dayLow}</Typography>
          </Box>
          <Box sx={{ shrink: 0 }}>
            <Typography variant="overline" color="GrayText">Change (24h)</Typography>
            <Typography variant="body2">{stock?.changesPercentage}%</Typography>
          </Box>
          <Box sx={{ ml: "auto" }}>
            <SearchBar />
          </Box>
        </Box>
        <CandleStickChart data={historical} />
        <Card
          sx={{
            backgroundColor: "transparent",
            p: 1,
            width: "70%",
            margin: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            component="form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Box sx={{ display: "flex", flexDirection: "column", p: 1 }}>
              <Typography>At Price</Typography>
              <Input
                placeholder="10.52"
                {...register("price")}
                value={price}
                onChange={(e) => handleInputChange(setPrice)(e)}
              />
              {errors.price?.message}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography>Amount</Typography>
              <Input
                placeholder="0"
                {...register("quantity")}
                value={quantity}
                onChange={(e) => handleInputChange(setQuantity)(e)}
              />
              {errors.quantity?.message}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography>Total Price</Typography>
              <Input
                placeholder="0"
                value={isNaN(totalPrice) ? "0" : totalPrice.toFixed(2)}
                readOnly
              />
            </Box>
            <Box>
              <Button variant="contained" type="submit">Buy</Button>
              {isBought && (
                <ConfirmBuyDialog
                  setisBought={setisBought}
                  open={isBought}
                  ticker={stock?.symbol}
                  price={price}
                  quantity={quantity}
                  totalCost={totalPrice.toFixed(2)}
                />
              )}
            </Box>
          </Box>
        </Card>
      </Box>
    )
  );
}

export default StockItem;
