import React, { useEffect, useState, useRef } from "react";
import "@/styles/App.css";
import AddStockDialog from "@/components/AddStockDialog.jsx";
import Card from "@mui/material/Card";
import { useAuth } from "@/contexts/AuthProvider";
import { Box } from "@mui/material";
import { useLoaderData } from "react-router-dom";
import { getStockData } from "@/api/stock";
import Button from "@mui/material/Button";
import useTruncatedElement from "@/hooks/showMoreText";
import LoadingImage from "@/components/LoadingImage";

export async function loader(ticker, token) {
  const stock = await getStockData(ticker, token);
  return stock;
}
function StockItem() {
  const { token } = useAuth();
  const data = useLoaderData();
  const [stockData, setStockData] = useState(null);
  const ref = useRef(null);

  const { isTruncated, isShowingMore, toggleIsShowingMore } =
    useTruncatedElement({
      ref,
      dependency: stockData?.description,
    });

  useEffect(() => {
    if (data) {
      const res = data;
      const options = { day: "2-digit", month: "2-digit", year: "numeric" };
      

      const stockInfo = {
        ticker: res.symbol,
        name: res.name,
        price: res.price,
        exchange: res.exchange,
        earningsAnnouncement: res.earningsAnnouncement, 
        priceAvg50: res.priceAvg50,
        priceAvg200: res.priceAvg200,
        yearHigh: res.yearHigh,
        yearLow: res.yearLow,
        imageUrl: res.image,
        sector: res.sector,
        ceo: res.ceo,
        website: res.website,
        description: res.description,
      };

      setStockData(stockInfo);
    }
  }, [data]);

  return (
    <div className="layout">
      <Card
        elevation={8}
        sx={{
          width: 1300,
          p: 1,
          margin: "auto",
          padding: 4,
          marginTop: "80px",
          bgcolor: "#423F3E",
          color: "whitesmoke",
        }}
      >
        {stockData && (
          <>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Box
                className="card-header"
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "60%",
                  margin: "auto",
                  marginBottom:'4em',
                  alignItems: "center",
                }}
              >
                <Box
                  className="card-title"
                  sx={{ display: "flex", flexDirection: "column", gap:1 }}
                >
                  <h2>{stockData.name}</h2>
                  <h4 style={{color: "#fff9" }}>
                    {stockData.ticker}
                  </h4>

                  <LoadingImage
                    src={stockData.imageUrl}
                    alt={stockData.ticker}
                    width="100"
                    height="100"
                  />
                </Box>
                <Box className="card-details">
                  <h3>Stock Price: {stockData.price}$</h3>
                  <h3>Stock Exchange: {stockData.exchange}</h3>
                  {/* <h3>Next Earnings date: {stockData.earningsAnnouncement}</h3> */}
                  <h3>Average 50 days price: {stockData.priceAvg50}$</h3>
                  <h3>
                    Stock's highest price this year: {stockData.yearHigh}$
                  </h3>
                  <h3>Stock's lowest price this year: {stockData.yearLow}$</h3>
                </Box>
              </Box>
              <Box className="description">
                <Box
                  ref={ref}
                  className={`break-words text-l ${
                    !isShowingMore && "line-clamp-3"
                  }`}
                  sx={{ color: "whitesmoke" }}
                >
                  {stockData.description}
                </Box>
                {isTruncated && (
                  <Button
                    onClick={toggleIsShowingMore}
                    variant="text"
                    sx={{ float: "right" }}
                  >
                    {isShowingMore ? "Show less" : "Show more"}
                  </Button>
                )}
                <div className="addStockBox" style={{ marginTop: "20px" }}>
                  <AddStockDialog
                    stock={stockData}
                    token={token}
                  ></AddStockDialog>
                </div>
              </Box>
            </Box>
          </>
        )}
        {stockData == null && <p>stock ticker isnt valid</p>}
      </Card>
    </div>
  );
}

export default StockItem;
