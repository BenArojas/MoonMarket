import React, { useEffect, useState,useRef } from "react";
import { useParams } from "react-router-dom";
import "@/styles/App.css";
import SharesDialog from "@/components/SharesDialog.jsx";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { addUserPurchase, addUserSale } from "@/api/user";
import { getStockFromPortfolio } from "@/api/stock";
import { useAuth } from "@/contexts/AuthProvider";
import { useLocation } from "react-router-dom";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import { useLoaderData } from "react-router-dom";
import LoadingImage from "@/components/LoadingImage";
import useTruncatedElement from '@/hooks/showMoreText'

export async function loader(ticker, token) {
  const stock = await getStockFromPortfolio(ticker, token);
  return stock;
}


function StockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const { token } = useAuth();
  const { stockTicker } = useParams();
  const data = useLoaderData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockData, setStockData] = useState({});
  const [dialog, setDialog] = useState({
    title: "",
    text: "",
    labelText: "",
    function: "",
    buttonText: "",
    stock: stockData,
    token: token,
  });

  const { isTruncated, isShowingMore, toggleIsShowingMore } = useTruncatedElement({
    ref,
    dependency: stockData.description
  });

  useEffect(() => {
    if (data) {
      setStockData(data);
    }
    // console.log("isTruncated", isTruncated, "isShowingMore: " + isShowingMore);
  }, [data, isTruncated, isShowingMore]);

  function handleClose() {
    setDialogOpen(false);
  }

  const handleAddClick = () => {
    setDialogOpen(true);
    setDialog((prevDialog) => ({
      ...prevDialog,
      title: "Add shares",
      text: "To add shares of the stock, please enter how many shares of the stock you bought and at which price.",
      labelText: "Enter bought price",
      function: addUserPurchase,
      buttonText: "Add",
      stock: data,
    }));
  };

  const handleDecreaseClick = () => {
    setDialogOpen(true);
    setDialog((prevDialog) => ({
      ...prevDialog,
      title: "Sell shares",
      text: "To sell shares of the stock, please enter how many shares of the stock you sold and at which price.",
      labelText: "Enter sold price",
      function: addUserSale,
      buttonText: "Sell",
      stock: data,
    }));
  };

  return (
    <div>
      <Card
        elevation={8}
        sx={{
          width: 800,
          p: 1,
          padding: 7,
          margin: "auto",
          marginTop: "70px",
          bgcolor: "#423F3E",
        }}
      >
        <Box
          className="card-header"
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            color: "whitesmoke",
            width: "65%",
            margin: "auto",
          }}
        >
          <Box className="card-title"  sx={{ display: "flex", flexDirection: "column", gap:1}}>
            <h2>{stockData.name}</h2>
            <h4 style={{  color: "#fff9" }}>
              {stockData.ticker}
            </h4>
            <LoadingImage
              src={`https://financialmodelingprep.com/image-stock/${stockTicker}.png`}
              width="100"
              height="100"
              alt={stockTicker}
            />
          </Box>
          <Box className="card-details">
            <h4>Stock price: ${stockData.price}</h4>
            <h4>Shares owned: {location.state.quantity}</h4>
            <h4>Portfolio share: {location.state.percentageOfPortfolio}%</h4>
          </Box>
        </Box>

        <Box
          className="buttons"
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: "2em",
            justifyContent: "center",
            padding: "2em",
          }}
        >
          <Button variant="contained" onClick={handleAddClick}>
            Buy
          </Button>
          <Button
            style={{ background: "red" }}
            variant="contained"
            onClick={handleDecreaseClick}
          >
            Sell
          </Button>
        </Box>

        <Box
          ref={ref}
          className={`break-words text-l ${!isShowingMore && "line-clamp-3"}`}
          sx={{ color: "whitesmoke" }}
        >
         {stockData.description}
        </Box>
        {isTruncated && (
          <Button onClick={toggleIsShowingMore} variant="text">
            {isShowingMore ? "Show less" : "Show more"}
          </Button>
        )}
      </Card>

      {dialogOpen && (
        <SharesDialog
          open={dialogOpen}
          handleClose={handleClose}
          dialog={dialog}
          addUserPurchase={addUserPurchase}
          addUserSale={addUserSale}
        />
      )}
    </div>
  );
}

export default StockPage;
