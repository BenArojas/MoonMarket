import { teal, red } from '@mui/material/colors';
import { getStockData } from '@/api/stock'

export function getPortfolioStats(stocksList, stocksInfo) {
  let tickers = [];
  let sum = 0;
  let totalSpent = 0;

  // Create a map of stocksInfo for O(1) lookup
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  for (const holding of stocksList) {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value = holding.quantity * stockInfo.price;
      sum += value;
      totalSpent += holding.avg_bought_price * holding.quantity;
      tickers.push(holding.ticker);
    }
  }

  return { tickers, sum, totalSpent };
}

export function processTreemapData(stocksList, stocksInfo) {
  const positiveStocks = [];
  const negativeStocks = [];
  let sum = 0;

  // Create a map of stocksInfo by ticker for O(1) lookup
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  // Process each holding and match with corresponding stock info
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (!stockInfo) return; // Skip if no matching stock info found

    const stock_avg_price = holding.avg_bought_price;
    const value = holding.quantity * stockInfo.price;
    sum += value;

    const stockData = {
      name: stockInfo.name,
      id: stockInfo._id,
      ticker: holding.ticker,
      value: value,
      avgSharePrice: stock_avg_price.toFixed(2),
      quantity: holding.quantity,
      last_price: stockInfo.price.toFixed(2),
      priceChangePercentage: (
        ((stockInfo.price - stock_avg_price) / stock_avg_price) * 100
      ).toFixed(2)
    };

    if (stockInfo.price > stock_avg_price) {
      positiveStocks.push(stockData);
    } else {
      negativeStocks.push(stockData);
    }
  });

  // Calculate percentage of portfolio
  const calculatePortfolioPercentage = (stocks) => {
    stocks.forEach(stock => {
      stock.percentageOfPortfolio = ((stock.value / sum) * 100).toFixed(2);
    });
  };

  calculatePortfolioPercentage(positiveStocks);
  calculatePortfolioPercentage(negativeStocks);

  // Build the final tree structure
  const newStocksTree = {
    name: "Stocks",
    value: 0,
    children: []
  };

  if (positiveStocks.length > 0) {
    newStocksTree.children.push({
      name: "Positive",
      value: 0,
      children: positiveStocks
    });
  }

  if (negativeStocks.length > 0) {
    newStocksTree.children.push({
      name: "Negative",
      value: 0,
      children: negativeStocks
    });
  }

  return newStocksTree;
}

export function processDonutData(stocksList, stocksInfo) {
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  let stocks = [];
  let totalPortfolioValue = 0;

  // First calculate total portfolio value
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Calculate percentage for each stock
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value = holding.quantity * stockInfo.price;
      const percentageOfPortfolio = Math.round(
        (value / totalPortfolioValue) * 100
      );

      stocks.push({
        name: holding.ticker,
        value: value,
        quantity: holding.quantity,
        percentageOfPortfolio: percentageOfPortfolio,
      });
    }
  });

  // Sort stocks by value in descending order
  stocks.sort((a, b) => b.value - a.value);

  // Handle "Others" category for more than 8 stocks
  const othersStocks = stocks.length > 8 ? stocks.slice(8) : [];
  if (othersStocks.length > 0) {
    const othersValue = othersStocks.reduce((acc, curr) => acc + curr.value, 0);
    const othersPercentage = othersStocks.reduce(
      (acc, curr) => acc + curr.percentageOfPortfolio,
      0
    );

    stocks = stocks.slice(0, 8);
    stocks.push({
      name: "Others",
      value: othersValue,
      percentageOfPortfolio: othersPercentage,
    });
  }

  stocks.othersStocks = othersStocks;
  return stocks;
}

export function processSankeyData(stocksList, stocksInfo) {
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  const nodes = [
    { id: "Positive", color: teal[500], value: 0 },
    { id: "Negative", color: red[500], value: 0 }
  ];

  const links = [];
  let positiveValue = 0;
  let negativeValue = 0;

  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (!stockInfo) return;

    const stock_avg_price = holding.avg_bought_price;
    const value = holding.quantity * stockInfo.price;
    const ticker = holding.ticker;
    const percentageChange = (
      ((stockInfo.price - stock_avg_price) / stock_avg_price) * 100
    ).toFixed(2);

    const nodeData = {
      id: ticker,
      name: stockInfo.name,
      value: value,
      percentageChange: percentageChange
    };

    nodes.push(nodeData);

    if (stockInfo.price > stock_avg_price) {
      positiveValue += value;
      links.push({ source: "Positive", target: ticker, value: value });
    } else {
      negativeValue += value;
      links.push({ source: "Negative", target: ticker, value: value });
    }
  });

  nodes[0].value = positiveValue;
  nodes[1].value = negativeValue;

  return { nodes, links };
}


// Helper function to generate random colors
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
export function processCircularData(stocksList, stocksInfo) {
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  let children = [];
  let sum = 0;
  let totalPortfolioValue = 0;

  // Calculate total portfolio value first
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Process each stock
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (!stockInfo) return;

    const value = holding.quantity * stockInfo.price;
    const ticker = holding.ticker;
    sum += value;
    const stock_avg_price = holding.avg_bought_price.toFixed(2);
    const percentageOfPortfolio = (
      (value / totalPortfolioValue) * 100
    ).toFixed(2);

    const stockType = stockInfo.price > stock_avg_price ? "positive" : "negative";

    children.push({
      type: "leaf",
      ticker: ticker,
      name: stockInfo.name,
      value: value,
      stockType: stockType,
      quantity: holding.quantity,
      avgSharePrice: stock_avg_price,
      last_price: stockInfo.price,
      percentageOfPortfolio: percentageOfPortfolio,
    });
  });

  return {
    type: "node",
    name: "stocks",
    value: sum,
    children: children,
  };
}

export function processLeaderboardsData(stocksList, stocksInfo) {
  const stocksInfoMap = stocksInfo.reduce((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});

  let totalPortfolioValue = 0;

  // Calculate total portfolio value first
  stocksList.forEach(holding => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Process each stock
  const LeaderboardsData = stocksList
    .map(holding => {
      const stockInfo = stocksInfoMap[holding.ticker];
      if (!stockInfo) return null;

      const value = (holding.quantity * stockInfo.price).toFixed(2);
      const priceChange = stockInfo.price - holding.avg_bought_price;
      const priceChangePercentage = (
        ((stockInfo.price - holding.avg_bought_price) / holding.avg_bought_price) * 100
      ).toFixed(2);
      const percentageOfPortfolio = (
        (parseFloat(value) / totalPortfolioValue) * 100
      ).toFixed(2);
      const gainLoss = (value - (holding.avg_bought_price * holding.quantity)).toFixed(2);

      return {
        ticker: holding.ticker,
        name: stockInfo.name,
        value: value,
        priceChange: priceChange,
        priceChangePercentage: priceChangePercentage,
        sharePrice: stockInfo.price,
        earnings: stockInfo.earnings,
        quantity: holding.quantity,
        percentageOfPortfolio: percentageOfPortfolio,
        gainLoss: gainLoss,
      };
    })
    .filter(Boolean) // Remove any null entries
    .sort((a, b) => b.priceChangePercentage - a.priceChangePercentage);

  return LeaderboardsData;
}



export function lastUpdateDate(data) {
  let last_update_date = data.last_refresh;
  let date = new Date(last_update_date); // Parse the UTC date

  // Convert to Israel's time zone
  let formattedDate = new Date(date).toLocaleString("en-GB", {
    timeZone: "Asia/Jerusalem", // Specify Israel time zone
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formattedDate;
}



export function transformData(historicalData) {
  return historicalData
    .map(item => ({
      time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
      value: item.close
    }))
    .sort((a, b) => a.time - b.time); // Sort in ascending order
}

export function transformSnapshotData(historicalData,) {
  return historicalData
    .map(item => ({
      time: new Date(item.timestamp).getTime() / 1000, // Convert to Unix timestamp
      value: item.value
    }))
    .sort((a, b) => a.time - b.time); // Sort in ascending order
}

export function calculatePerformanceData(data) {
  return data.map(item => {
    const moneySpent = item.cumulativeSpent || 0;
    if (moneySpent === 0) return null;

    return {
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      value: Number(((item.value - moneySpent) / moneySpent) * 100),
    };
  }).filter(item => item !== null)
    .sort((a, b) => a.time - b.time);
}

export const calculateTransactionSummary = (transactions, currentStockPrices) => {
  let totalTrades = 0;
  let closedTrades = 0;
  let profitableTrades = 0;  // Keep this to calculate win rate
  let moneySpent = 0;
  let totalProfit = 0;

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
  );

  // Group transactions by ticker
  const positionsByTicker = {};

  sortedTransactions.forEach(transaction => {
    const { ticker } = transaction;

    if (!positionsByTicker[ticker]) {
      positionsByTicker[ticker] = {
        transactions: [],
        isFullyClosed: false,
        totalQuantity: 0,
        totalCost: 0,
        realizedProfit: 0
      };
      totalTrades++;
    }

    const position = positionsByTicker[ticker];
    position.transactions.push(transaction);

    // Update position quantities and costs
    if (transaction.type === 'purchase') {
      position.totalQuantity += transaction.quantity;
      position.totalCost += transaction.price * transaction.quantity;
      moneySpent += transaction.price * transaction.quantity;
    } else if (transaction.type === 'sale') {
      const saleValue = transaction.price * transaction.quantity;
      const avgCost = position.totalCost / position.totalQuantity;
      const costBasis = avgCost * transaction.quantity;

      position.realizedProfit += saleValue - costBasis;
      position.totalQuantity -= transaction.quantity;
      position.totalCost = avgCost * position.totalQuantity;

      if (position.totalQuantity === 0 || transaction.text.includes("Closed position:")) {
        position.isFullyClosed = true;
        closedTrades++;

        // Check if the trade was profitable
        if (position.realizedProfit > 0) {
          profitableTrades++;
        }

        totalProfit += position.realizedProfit;
      }
    }
  });

  // Calculate unrealized profit for open positions
  Object.entries(positionsByTicker).forEach(([ticker, position]) => {
    if (!position.isFullyClosed && currentStockPrices[ticker] && position.totalQuantity > 0) {
      const currentPrice = currentStockPrices[ticker];
      const avgCost = position.totalCost / position.totalQuantity;
      const unrealizedProfit = (currentPrice - avgCost) * position.totalQuantity;
      totalProfit += unrealizedProfit;
    }
  });

  // Calculate win rate: profitable trades divided by closed trades
  const winRate = closedTrades > 0 ? (profitableTrades / closedTrades) * 100 : 0;

  return {
    totalTrades,
    closedTrades,
    moneySpent: Number(moneySpent.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    winRate: Number(winRate.toFixed(1))
  };
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Format date
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};