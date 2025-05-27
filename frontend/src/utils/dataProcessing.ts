import { ChartDataPoint } from '@/components/CurrentStockChart';
import {  SankeyInputData, SankeyInputLink, SankeyInputNode } from '@/components/SankeyChart';
import { StockData } from '@/contexts/StocksDataContext';
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


export type TreemapData = {
  name: string;
  value: number;
  children: { name: string; value: number; children: any[] }[];
}
// Treemap Data Processing
export function processTreemapData(stocks: { [symbol: string]: StockData }): TreemapData {
  
  type ProcessedStockData = {
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

  const positiveStocks: ProcessedStockData[] = [];
  const negativeStocks: ProcessedStockData[] = [];
  let sum: number = 0;

  // Process each stock from the stocks object
  Object.entries(stocks).forEach(([ticker, stockData]) => {
    const value: number = stockData.value;
    sum += value;

    const processedStock: ProcessedStockData = {
      name: ticker, // Using ticker as name since we don't have separate name field
      id: ticker, // Using ticker as id
      ticker: ticker,
      value,
      avgSharePrice: stockData.avgBoughtPrice.toFixed(2),
      quantity: stockData.quantity,
      last_price: stockData.lastPrice.toFixed(2),
      priceChangePercentage: (
        ((stockData.lastPrice - stockData.avgBoughtPrice) / stockData.avgBoughtPrice) * 100
      ).toFixed(2),
    };

    if (stockData.lastPrice > stockData.avgBoughtPrice) {
      positiveStocks.push(processedStock);
    } else {
      negativeStocks.push(processedStock);
    }
  });

  // Calculate percentage of portfolio
  const calculatePortfolioPercentage = (stocksArray: ProcessedStockData[]): void => {
    stocksArray.forEach((stock: ProcessedStockData) => {
      stock.percentageOfPortfolio = ((stock.value / sum) * 100).toFixed(2);
    });
  };

  calculatePortfolioPercentage(positiveStocks);
  calculatePortfolioPercentage(negativeStocks);

  // Build the final tree structure
  const newStocksTree: {
    name: string;
    value: number;
    children: { name: string; value: number; children: ProcessedStockData[] }[];
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

export function processDonutData(stocks: { [symbol: string]: StockData }): DonutData[] {
  type ProcessedStockData = {
    name: string;
    value: number;
    quantity: number;
    percentageOfPortfolio: number;
  }

  const stocksArray: ProcessedStockData[] = [];
  let totalPortfolioValue: number = 0;

  // Calculate total portfolio value
  Object.entries(stocks).forEach(([ticker, stockData]) => {
    totalPortfolioValue += stockData.value;
  });

  // Process each stock and calculate percentage
  Object.entries(stocks).forEach(([ticker, stockData]) => {
    const percentageOfPortfolio: number = Math.round(
      (stockData.value / totalPortfolioValue) * 100
    );

    stocksArray.push({
      name: ticker,
      value: stockData.value,
      quantity: stockData.quantity,
      percentageOfPortfolio,
    });
  });

  // Sort stocks by value in descending order
  stocksArray.sort((a: ProcessedStockData, b: ProcessedStockData) => b.value - a.value);

  // Handle "Others" category for more than 8 stocks
  const othersStocks: ProcessedStockData[] = stocksArray.length > 8 ? stocksArray.slice(8) : [];
  if (othersStocks.length > 0) {
    const othersValue: number = othersStocks.reduce(
      (acc: number, curr: ProcessedStockData) => acc + curr.value,
      0
    );
    const othersPercentage: number = othersStocks.reduce(
      (acc: number, curr: ProcessedStockData) => acc + curr.percentageOfPortfolio,
      0
    );

    stocksArray.length = 8; // Trim to first 8
    stocksArray.push({
      name: "Others",
      value: othersValue,
      percentageOfPortfolio: othersPercentage,
      quantity: 0, // Quantity not relevant for "Others"
    });
  }

  // Attach othersStocks to the result
  Object.defineProperty(stocksArray, "othersStocks", {
    value: othersStocks,
    writable: true,
    enumerable: false,
  });

  return stocksArray;
}
// Sankey Data Processing
export function processSankeyData(stocks: { [symbol: string]: StockData }): SankeyInputData {
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

  Object.entries(stocks).forEach(([ticker, stockData]) => {
    // Skip if we don't have proper price data
    if (!stockData.avgBoughtPrice || stockData.avgBoughtPrice <= 0) return;

    const stock_avg_price: number = stockData.avgBoughtPrice;
    const current_price: number = stockData.lastPrice;
    const value: number = stockData.value; // Current market value
    const percentageChange: string = (
      ((current_price - stock_avg_price) / stock_avg_price) * 100
    ).toFixed(2);

    // Create the node data for the stock
    const nodeData: SankeyInputNode = {
      id: ticker,
      name: ticker, // Using ticker as name since we don't have separate company name
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

export type StockChild = {
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
export function processCircularData(stocks: { [symbol: string]: StockData }): CircularData {
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
  Object.values(stocks).forEach((stockData) => {
    totalPortfolioValue += stockData.value;
  });

  // Process each stock
  Object.entries(stocks).forEach(([ticker, stockData]) => {
    const value: number = stockData.value;
    sum += value;
    const stock_avg_price: string = stockData.avgBoughtPrice.toFixed(2);
    const percentageOfPortfolio: string = (
      (value / totalPortfolioValue) * 100
    ).toFixed(2);

    const stockType: string = stockData.lastPrice > stockData.avgBoughtPrice ? "positive" : "negative";

    children.push({
      type: "leaf",
      ticker,
      name: ticker, // Using ticker as name since we don't have separate company name
      value,
      stockType,
      quantity: stockData.quantity,
      avgSharePrice: stock_avg_price,
      last_price: stockData.lastPrice,
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
export function processLeaderboardsData(stocks: { [symbol: string]: StockData }): {
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
  let totalPortfolioValue: number = 0;

  // Calculate total portfolio value first
  Object.values(stocks).forEach((stockData) => {
    totalPortfolioValue += stockData.value;
  });

  // Process each stock
  const LeaderboardsData = Object.entries(stocks)
    .map(([ticker, stockData]) => {
      const value: string = stockData.value.toFixed(2);
      const priceChange: number = stockData.lastPrice - stockData.avgBoughtPrice;
      const priceChangePercentage: string = (
        ((stockData.lastPrice - stockData.avgBoughtPrice) / stockData.avgBoughtPrice) * 100
      ).toFixed(2);
      const percentageOfPortfolio: string = (
        (stockData.value / totalPortfolioValue) * 100
      ).toFixed(2);
      const gainLoss: string = (
        stockData.value - (stockData.avgBoughtPrice * stockData.quantity)
      ).toFixed(2);

      return {
        ticker: ticker,
        name: ticker, // Using ticker as name since we don't have separate company name
        value,
        priceChange,
        priceChangePercentage,
        sharePrice: stockData.lastPrice,
        earnings: "N/A", // Not available in your current data structure
        quantity: stockData.quantity,
        percentageOfPortfolio,
        gainLoss,
      };
    })
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