import axios from "axios";

export async function postApiStock(portfolioStock, token) {
  return axios.post("http://localhost:8000/stocks/add_stock", portfolioStock, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getStockData(ticker, token) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const stock = await axios.get(
      `http://localhost:8000/stocks/quote/${ticker}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return stock.data;
  }
}

export async function getHistoricalData(ticker, token) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const data = await axios.get(
      `http://localhost:8000/stocks/historical_data/${ticker}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data.data;
  }
}

export async function getIntradyData(ticker, token) {
  if (isValidStockTicker(ticker) === false) {
    return false;
  } else {
    const data = await axios.get(
      `http://localhost:8000/stocks/intrady_chart/${ticker}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data.data;
  }
}

function isValidStockTicker(ticker) {
  // Check if ticker is a string and has length between 1 and 5
  if (typeof ticker === "string" && ticker.length >= 1 && ticker.length <= 5) {
    // Check if ticker contains only alphabetic characters
    if (/^[A-Za-z]+$/.test(ticker)) {
      // Convert ticker to uppercase
      ticker = ticker.toUpperCase();
      return true;
    }
  }
  return false;
}

export async function getStockFromPortfolio(ticker, token) {
  const stock = await axios.get(`http://localhost:8000/stocks/${ticker}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return stock.data;
}

export async function updateStockPrice(ticker, token) {
  try {
    const response = await axios.put(
      `http://localhost:8000/stocks/update_stock_price/${ticker}`,
      {}, // This is the data payload. Use an empty object if no data to send.
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; // Return response data if needed
  } catch (error) {
    console.error(`Failed to update ${ticker}:`, error);
    throw error; // Re-throw the error for further handling if necessary
  }
}

export async function deleteStock(ticker, token) {
  const stock = await axios.delete(
    `http://localhost:8000/stocks/delete/${ticker}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
