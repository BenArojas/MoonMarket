import api from "@/api/axios";



export async function getStockData(ticker: string) {
  try {
    const stock = await api.get(`/stock/quote/${ticker}`);
    return stock.data; // Return the object directly
  } catch (error) {
    // console.error(`Error fetching stock data for ${ticker}:`, error);
    return null; // Return null on error
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

export async function getStocksFromPortfolio() {
  const stockData = await api.get(`/stock/portfolio`);
  return stockData.data;
}

export async function updateStockPrices() {
  try {
    const response = await api.post(
      `/stock/update_stock_prices`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update stocks:`, error);
    throw error;
  }
}

