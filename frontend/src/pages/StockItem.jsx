import React, { useEffect, useState, useRef } from "react";
import "@/styles/App.css";
import ConfirmBuyDialog from "@/components/ConfirmBuy.jsx";
import Card from "@mui/material/Card";
import { useAuth } from "@/contexts/AuthProvider";
import { Box, Divider, Typography } from "@mui/material";
import { useLoaderData } from "react-router-dom";
import { getStockData, getHistoricalData } from "@/api/stock";
import Button from "@mui/material/Button";
import LoadingImage from "@/components/LoadingImage";
import "@/styles/global.css";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import CandleStickChart from "@/components/CandleSticksChart";
import Input from "@mui/material/Input";
import { transactionSchema } from "@/schemas/transaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { addStockToPortfolio } from "@/api/user";
import { Height } from "@mui/icons-material";

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

  const { mutateAsync: addStockMutation } = useMutation({
    mutationFn: ({ portfolioStock, price, quantity, token }) =>
      addStockToPortfolio(portfolioStock, price, quantity, token),
  });

  const onSubmit = async (data) => {
    try {
      const portfolioStock = {
        name: stock.name,
        ticker: symbol,
        description: "",
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
    <Box
      className="layoutContainer"
      sx={{
        display: "grid",
        // flex: 1,
        gridTemplateRows: "auto 1fr auto",
        gap: 5,
        margin: "auto",
        width: "80%",
      }}
    >
      <Box sx={{ display: "flex", gap: 5, alignItems: "center" }}>
        <Typography variant="h4">{symbol}</Typography>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            Last Price
          </Typography>
          <Typography variant="body2">{stock?.price}</Typography>
        </Box>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            Volume
          </Typography>
          <Typography variant="body2">{stock?.volume.toLocaleString("en-US")}</Typography>
        </Box>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            High (24h)
          </Typography>
          <Typography variant="body2">{stock?.dayHigh}</Typography>
        </Box>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            Low (24h)
          </Typography>
          <Typography variant="body2">{stock?.dayLow}</Typography>
        </Box>
        <Box sx={{ shrink: 0 }}>
          <Typography variant="overline" color="GrayText">
            Change (24h)
          </Typography>
          <Typography variant="body2">{stock?.changesPercentage}%</Typography>
        </Box>
        <Box sx={{ ml: "auto" }}>
          <FormControl>
            <InputLabel id="demo-simple-select-label">Age</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={age}
              label="Age"
              className=""
              onChange={handleChange}
              sx={{
                width: 120,
              }}
            >
              <MenuItem value={10}>Ten</MenuItem>
              <MenuItem value={20}>Twenty</MenuItem>
              <MenuItem value={30}>Thirty</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      
      <CandleStickChart data={historical}/>
      
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
            // gap:6,
            alignItems: "center",
          }}
          component={"form"}
          onSubmit={handleSubmit(onSubmit)}
        >
          <Box sx={{ display: "flex", flexDirection: "Column", p: 1 }}>
            <Typography>At Price</Typography>
            <Input
              placeholder="10.52"
              {...register("price")}
              value={price}
              onChange={handleInputChange(setPrice)}
            ></Input>
            {errors.price?.message ?? null}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "Column" }}>
            <Typography>Amount</Typography>
            <Input
              placeholder="0"
              {...register("quantity")}
              value={quantity}
              onChange={handleInputChange(setQuantity)}
            ></Input>
            {errors.quantity?.message ?? null}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "Column" }}>
            <Typography>Total Price</Typography>
            <Input
              placeholder="0"
              value={isNaN(totalPrice) ? "0" : totalPrice.toFixed(2)}
              readOnly
            ></Input>
          </Box>
          <Box>
            <Button variant="contained" type="submit">
              Buy
            </Button>
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
  );
}

export default StockItem;
