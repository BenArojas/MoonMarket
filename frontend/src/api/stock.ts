import api from "@/api/axios";



export async function getStockData(ticker: string) {
  const stock = await api.get(
    `/stock/quote/${ticker}`
  );
  if (stock.data.length == 0) {
    return null;
  } else {
    return stock.data[0];
  }
}



export async function getHistoricalData(ticker: string) {
  const res = await api.get(`/stock/historical_data/${ticker}`);
  return res.data;  
}


export async function getIntradayData(ticker: string, range: string) {
  const data = await api.get(
    `/stock/intraday_chart/${ticker}?range=${range}`
  );
  return data.data;
}


// function isValidStockTicker(ticker) {
//   // Check if ticker is a string and has length between 1 and 5
//   if (typeof ticker === "string" ) {
//     // Check if ticker contains only alphabetic characters
//     if (/^[A-Za-z]+$/.test(ticker)) {
//       // Convert ticker to uppercase
//       ticker = ticker.toUpperCase();
//       return true;
//     }
//   }
//   return false;
// }

export async function getStocksFromPortfolio(tickers: string[]) {
  const stockData = await api.post(`/stock/portfolio`, {
    tickers: tickers,
  });
  return stockData.data;
}

export async function updateStockPrices(tickers: string[]) {
  try {
    const response = await api.put(
      `/stock/update_stock_prices`,
      { tickers }, // Send tickers array in request body
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update stocks:`, error);
    throw error;
  }
}

export async function deleteStock(ticker: string) {
  const stock = await api.delete(
    `/stock/delete/${ticker}`
  );
  return stock.data; // Return response data if needed
}