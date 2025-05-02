import { ChartDataPoint } from '@/components/CurrentStockChart';
import {  SankeyInputData, SankeyInputLink, SankeyInputNode } from '@/components/SankeyChart';
import { HoldingData } from '@/contexts/UserContext';
import { Transaction } from '@/hooks/useTransactionSummary';

export type StockInfo = {
  earnings: string;
  last_updated: string;
  name: string;
  price: number;
  ticker: string
  _id: string
}

export function getPortfolioStats(stocksList: HoldingData[], stocksInfo: StockInfo[]) {
  let tickers: string[] = [];
  let sum: number = 0;
  let totalSpent: number = 0;

  // Define the type of stocksInfoMap as a Record with string keys and StockInfo values
  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} as Record<string, StockInfo>
  );

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

export type TreemapData = {
  name: string;
  value: number;
  children: { name: string; value: number; children: any[] }[];
}
// Treemap Data Processing
export function processTreemapData(stocksList: HoldingData[], stocksInfo: StockInfo[]): TreemapData {
  
  type StockData = {
    name: string;
    id: string;
    ticker: string;
    value: number;
    avgSharePrice: string;
    quantity: number;
    last_price: string;
    priceChangePercentage: string;
    percentageOfPortfolio?: string;
  }

  const positiveStocks: StockData[] = [];
  const negativeStocks: StockData[] = [];
  let sum: number = 0;

  // Create a map of stocksInfo by ticker for O(1) lookup
  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} as Record<string, StockInfo>
  );

  // Process each holding and match with corresponding stock info
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (!stockInfo) return; // Skip if no matching stock info found

    const stock_avg_price: number = holding.avg_bought_price;
    const value: number = holding.quantity * stockInfo.price;
    sum += value;

    const stockData: StockData = {
      name: stockInfo.name,
      id: stockInfo._id,
      ticker: holding.ticker,
      value,
      avgSharePrice: stock_avg_price.toFixed(2),
      quantity: holding.quantity,
      last_price: stockInfo.price.toFixed(2),
      priceChangePercentage: (
        ((stockInfo.price - stock_avg_price) / stock_avg_price) * 100
      ).toFixed(2),
    };

    if (stockInfo.price > stock_avg_price) {
      positiveStocks.push(stockData);
    } else {
      negativeStocks.push(stockData);
    }
  });

  // Calculate percentage of portfolio
  const calculatePortfolioPercentage = (stocks: StockData[]): void => {
    stocks.forEach((stock: StockData) => {
      stock.percentageOfPortfolio = ((stock.value / sum) * 100).toFixed(2);
    });
  };

  calculatePortfolioPercentage(positiveStocks);
  calculatePortfolioPercentage(negativeStocks);

  // Build the final tree structure
  const newStocksTree: {
    name: string;
    value: number;
    children: { name: string; value: number; children: StockData[] }[];
  } = {
    name: "Stocks",
    value: 0,
    children: [],
  };

  if (positiveStocks.length > 0) {
    newStocksTree.children.push({
      name: "Positive",
      value: 0,
      children: positiveStocks,
    });
  }

  if (negativeStocks.length > 0) {
    newStocksTree.children.push({
      name: "Negative",
      value: 0,
      children: negativeStocks,
    });
  }

  return newStocksTree;
}

// Donut Data Processing
export type DonutData = {
  name: string;
  value: number;
  quantity: number;
  percentageOfPortfolio: number;
  othersStocks?: any[];
}
export function processDonutData(stocksList: HoldingData[], stocksInfo: StockInfo[]): DonutData[] {
  type StockData  = {
    name: string;
    value: number;
    quantity: number;
    percentageOfPortfolio: number;
  }

  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} as Record<string, StockInfo>
  );

  const stocks: StockData[] = [];
  let totalPortfolioValue: number = 0;

  // First calculate total portfolio value
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value: number = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Calculate percentage for each stock
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value: number = holding.quantity * stockInfo.price;
      const percentageOfPortfolio: number = Math.round(
        (value / totalPortfolioValue) * 100
      );

      stocks.push({
        name: holding.ticker,
        value,
        quantity: holding.quantity,
        percentageOfPortfolio,
      });
    }
  });

  // Sort stocks by value in descending order
  stocks.sort((a: StockData, b: StockData) => b.value - a.value);

  // Handle "Others" category for more than 8 stocks
  const othersStocks: StockData[] = stocks.length > 8 ? stocks.slice(8) : [];
  if (othersStocks.length > 0) {
    const othersValue: number = othersStocks.reduce(
      (acc: number, curr: StockData) => acc + curr.value,
      0
    );
    const othersPercentage: number = othersStocks.reduce(
      (acc: number, curr: StockData) => acc + curr.percentageOfPortfolio,
      0
    );

    stocks.length = 8; // Trim to first 8
    stocks.push({
      name: "Others",
      value: othersValue,
      percentageOfPortfolio: othersPercentage,
      quantity: 0, // Quantity not relevant for "Others"
    });
  }

  // Attach othersStocks to the result
  Object.defineProperty(stocks, "othersStocks", {
    value: othersStocks,
    writable: true,
    enumerable: false,
  });

  return stocks;
}

// Sankey Data Processing
// --- Data Processing Function ---
// This function now correctly returns the INPUT data structure
export function processSankeyData(stocksList: HoldingData[], stocksInfo: StockInfo[]): SankeyInputData {
  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} // No need for explicit type assertion here
  );

  // Nodes conforming to SankeyInputNode
  const nodes: SankeyInputNode[] = [
    // Initialize value to 0, it will be summed up later
    { id: "Positive", value: 0 }, // Removed color string, handled in component
    { id: "Negative", value: 0 }, // Removed color string, handled in component
  ];

  // Links conforming to SankeyInputLink
  const links: SankeyInputLink[] = [];
  let positiveValue: number = 0;
  let negativeValue: number = 0;

  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    // Skip if we don't have matching price/name info for the holding
    if (!stockInfo || !holding.avg_bought_price || holding.avg_bought_price <= 0) return;

    const stock_avg_price: number = holding.avg_bought_price;
    const current_price: number = stockInfo.price;
    const value: number = holding.quantity * current_price; // Current market value
    const ticker: string = holding.ticker;
    const percentageChange: string = (
      ((current_price - stock_avg_price) / stock_avg_price) * 100
    ).toFixed(2);

    // Create the node data for the stock
    const nodeData: SankeyInputNode = {
      id: ticker,
      name: stockInfo.name, // Add the company name
      value, // Set the value for the node itself (d3 might recalculate based on links)
      percentageChange,
    };

    nodes.push(nodeData);

    // Create links from Positive/Negative nodes
    if (current_price > stock_avg_price) {
      positiveValue += value;
      links.push({ source: "Positive", target: ticker, value });
    } else {
      // Includes cases where price is equal or less than average bought price
      negativeValue += value;
      links.push({ source: "Negative", target: ticker, value });
    }
  });

  // Find the Positive/Negative nodes and update their total values
  const positiveNode = nodes.find(n => n.id === "Positive");
  const negativeNode = nodes.find(n => n.id === "Negative");
  if (positiveNode) positiveNode.value = positiveValue;
  if (negativeNode) negativeNode.value = negativeValue;


  // Filter out nodes with zero value AFTER summing (optional, but good practice)
  const finalNodes = nodes.filter(node => node.value !== undefined && node.value > 0);
  // Filter links to only include those connecting remaining nodes
  const finalNodeIds = new Set(finalNodes.map(n => n.id));
  const finalLinks = links.filter(link => finalNodeIds.has(link.source) && finalNodeIds.has(link.target));


  // Return the data structure conforming to SankeyInputData
  return { nodes: finalNodes, links: finalLinks };
}


export type StockChild  = {
  type: string;
  ticker: string;
  name: string;
  value: number;
  stockType: string;
  quantity: number;
  avgSharePrice: string;
  last_price: number;
  percentageOfPortfolio: string;
}

// Define the type for the returned object
export type CircularData = {
  type: string;
  name: string;
  value: number;
  children: StockChild[];
}
// Circular Data Processing
export function processCircularData(stocksList: HoldingData[], stocksInfo: StockInfo[]): CircularData {
  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} as Record<string, StockInfo>
  );

  const children: {
    type: string;
    ticker: string;
    name: string;
    value: number;
    stockType: string;
    quantity: number;
    avgSharePrice: string;
    last_price: number;
    percentageOfPortfolio: string;
  }[] = [];
  let sum: number = 0;
  let totalPortfolioValue: number = 0;

  // Calculate total portfolio value first
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value: number = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Process each stock
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (!stockInfo) return;

    const value: number = holding.quantity * stockInfo.price;
    const ticker: string = holding.ticker;
    sum += value;
    const stock_avg_price: string = holding.avg_bought_price.toFixed(2);
    const percentageOfPortfolio: string = (
      (value / totalPortfolioValue) * 100
    ).toFixed(2);

    const stockType: string = stockInfo.price > holding.avg_bought_price ? "positive" : "negative";

    children.push({
      type: "leaf",
      ticker,
      name: stockInfo.name,
      value,
      stockType,
      quantity: holding.quantity,
      avgSharePrice: stock_avg_price,
      last_price: stockInfo.price,
      percentageOfPortfolio,
    });
  });

  return {
    type: "node",
    name: "stocks",
    value: sum,
    children,
  };
}

// Leaderboards Data Processing
export function processLeaderboardsData(stocksList: HoldingData[], stocksInfo: StockInfo[]): {
  ticker: string;
  name: string;
  value: string;
  priceChange: number;
  priceChangePercentage: string;
  sharePrice: number;
  earnings: string;
  quantity: number;
  percentageOfPortfolio: string;
  gainLoss: string;
}[] {
  const stocksInfoMap: Record<string, StockInfo> = stocksInfo.reduce(
    (acc: Record<string, StockInfo>, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    },
    {} as Record<string, StockInfo>
  );

  let totalPortfolioValue: number = 0;

  // Calculate total portfolio value first
  stocksList.forEach((holding: HoldingData) => {
    const stockInfo = stocksInfoMap[holding.ticker];
    if (stockInfo) {
      const value: number = holding.quantity * stockInfo.price;
      totalPortfolioValue += value;
    }
  });

  // Process each stock
  const LeaderboardsData = stocksList
    .map((holding: HoldingData) => {
      const stockInfo = stocksInfoMap[holding.ticker];
      if (!stockInfo) return null;

      const value: string = (holding.quantity * stockInfo.price).toFixed(2);
      const priceChange: number = stockInfo.price - holding.avg_bought_price;
      const priceChangePercentage: string = (
        ((stockInfo.price - holding.avg_bought_price) / holding.avg_bought_price) * 100
      ).toFixed(2);
      const percentageOfPortfolio: string = (
        (parseFloat(value) / totalPortfolioValue) * 100
      ).toFixed(2);
      const gainLoss: string = (
        parseFloat(value) - (holding.avg_bought_price * holding.quantity)
      ).toFixed(2);

      return {
        ticker: holding.ticker,
        name: stockInfo.name,
        value,
        priceChange,
        priceChangePercentage,
        sharePrice: stockInfo.price,
        earnings: stockInfo.earnings,
        quantity: holding.quantity,
        percentageOfPortfolio,
        gainLoss,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null) // Remove null entries
    .sort((a, b) => parseFloat(b.priceChangePercentage) - parseFloat(a.priceChangePercentage));

  return LeaderboardsData;
}



export function lastUpdateDate(last_refresh: string | null): string {
  const date = last_refresh ? new Date(last_refresh) : new Date(); // Fallback to current date

  let formattedDate = date.toLocaleString("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formattedDate;
}

type LinkedUser = {
  collection: string;
  id: string
}
export type SnapshotData = {
  cumulativeSpent: number;
  timestamp: string;
  value: number;
  _id: string;
  userId: LinkedUser
}
export function transformSnapshotData(historicalData: SnapshotData[]): ChartDataPoint[] {
  return historicalData
    .map(item => ({
      time: (new Date(item.timestamp).getTime() / 1000) as UTCTimestamp, // Produces a number (UTCTimestamp)
      value: item.value,
    }))
    .sort((a, b) => (a.time as number) - (b.time as number)); // Sort as **Updated**: TypeScript needs type assertion since Time is a union type
}

export function calculatePerformanceData(data: SnapshotData[]): ChartDataPoint[] {
  return data.map(item => {
    const moneySpent = item.cumulativeSpent || 0;
    if (moneySpent === 0) return null;

    return {
      time: (new Date(item.timestamp).getTime() / 1000) as UTCTimestamp,
      value: Number(((item.value - moneySpent) / moneySpent) * 100),
    };
  }).filter(item => item !== null)
    .sort((a, b) => a.time - b.time);
}


type Position =  {
  transactions: Transaction[];
  isFullyClosed: boolean;
  totalQuantity: number;
  totalCost: number;
  realizedProfit: number;
}

type TransactionSummary =  {
  totalTrades: number;
  closedTrades: number;
  moneySpent: number;
  totalProfit: number;
  winRate: number;
}
export const calculateTransactionSummary = (
  transactions: Transaction[],
  currentStockPrices: Record<string, number>
): TransactionSummary => {
  let totalTrades: number = 0;
  let closedTrades: number = 0;
  let profitableTrades: number = 0;
  let moneySpent: number = 0;
  let totalProfit: number = 0;

  // Sort transactions by date
  const sortedTransactions: Transaction[] = [...transactions].sort(
    (a: Transaction, b: Transaction) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  // Group transactions by ticker
  const positionsByTicker: Record<string, Position> = {};

  sortedTransactions.forEach((transaction: Transaction) => {
    const { ticker } = transaction;

    if (!positionsByTicker[ticker]) {
      positionsByTicker[ticker] = {
        transactions: [],
        isFullyClosed: false,
        totalQuantity: 0,
        totalCost: 0,
        realizedProfit: 0,
      };
      totalTrades++;
    }

    const position: Position = positionsByTicker[ticker];
    position.transactions.push(transaction);

    // Update position quantities and costs
    if (transaction.type === 'purchase') {
      position.totalQuantity += transaction.quantity;
      position.totalCost += transaction.price * transaction.quantity;
      moneySpent += transaction.price * transaction.quantity;
    } else if (transaction.type === 'sale') {
      const saleValue: number = transaction.price * transaction.quantity;
      const avgCost: number = position.totalCost / position.totalQuantity;
      const costBasis: number = avgCost * transaction.quantity;

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
  Object.entries(positionsByTicker).forEach(([ticker, position]: [string, Position]) => {
    if (!position.isFullyClosed && currentStockPrices[ticker] && position.totalQuantity > 0) {
      const currentPrice: number = currentStockPrices[ticker];
      const avgCost: number = position.totalCost / position.totalQuantity;
      const unrealizedProfit: number = (currentPrice - avgCost) * position.totalQuantity;
      totalProfit += unrealizedProfit;
    }
  });

  // Calculate win rate: profitable trades divided by closed trades
  const winRate: number = closedTrades > 0 ? (profitableTrades / closedTrades) * 100 : 0;

  return {
    totalTrades,
    closedTrades,
    moneySpent: Number(moneySpent.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
  };
};

// Format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

import { Time, BusinessDay, UTCTimestamp } from 'lightweight-charts';

export const formatDate = (input: string | Time): string => {
  let date: Date;
  if (typeof input === 'string') {
    date = new Date(input); // Parse string date
  } else if (typeof input === 'number') {
    date = new Date(input * 1000); // Unix timestamp in seconds (UTCTimestamp)
  } else {
    // Handle BusinessDay
    const businessDay = input as BusinessDay;
    date = new Date(businessDay.year, businessDay.month - 1, businessDay.day); // month is 1-based
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};