import api from "@/api/axios";


export async function postApiStock(portfolioStock) {
  return api.post(`/stock/add_stock`, portfolioStock, );
}

export async function getStockData(ticker) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const stock = await api.get(
      `/stock/quote/${ticker}`
    );
    if(stock.data.length == 0) {
    return null;
  }else{
    return stock.data[0];
  }
}
}

export async function getHistoricalData(ticker) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const data = await api.get(
      `/stock/historical_data/${ticker}`
    );
    return data.data;
  }
}

export async function getIntradyData(ticker) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const data = await api.get(
      `/stock/intrady_chart/${ticker}`
    );
    return data.data;
  }
}

function isValidStockTicker(ticker) {
  // Check if ticker is a string and has length between 1 and 5
  if (typeof ticker === "string" ) {
    // Check if ticker contains only alphabetic characters
    if (/^[A-Za-z]+$/.test(ticker)) {
      // Convert ticker to uppercase
      ticker = ticker.toUpperCase();
      return true;
    }
  }
  return false;
}

export async function getStockFromPortfolio(ticker) {
  const stock = await api.get(`/stock/${ticker}`);
  return stock.data;
}

export async function updateStockPrice(ticker ) {
  try {
    const response = await api.put(
      `/stock/update_stock_price/${ticker}`,
      {}, // This is the data payload. Use an empty object if no data to send.
     
    );
    return response.data; // Return response data if needed
  } catch (error) {
    console.error(`Failed to update ${ticker}:`, error);
    throw error; // Re-throw the error for further handling if necessary
  }
}

export async function deleteStock(tickeroken) {
  const stock = await api.delete(
    `/stock/delete/${ticker}`
  );
  return stock.data; // Return response data if needed
}
