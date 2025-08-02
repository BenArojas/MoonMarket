import { DonutDatum } from '@/components/charts/DonutChart';
import { SankeyInputData, SankeyInputLink, SankeyInputNode } from '@/components/charts/SankeyChart';
import { AllocationDTO, AllocationView } from '@/types/position';
import { StockData } from '@/types/stock';


export function formatNumber(
  value: number | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
    suffix?: string;
  }
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return options?.fallback ?? '--';
  }

  return (
    value.toLocaleString('en-US', {
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }) + (options?.suffix ?? '')
  );
}


export type ProcessedStockData = {
  name: string;
  ticker: string;
  value: number;
  avgSharePrice: number;
  quantity: number;
  last_price: number;
  priceChangePercentage: number;
  dailyChangePercentage?: number; 
  percentageOfPortfolio?: number;
}

export type TreemapData = {
  name: string;
  value: number;
  children: { 
    name: string; 
    value: number; 
    children: ProcessedStockData[] 
  }[];
}

// Treemap Data Processing
export function processTreemapData(
  stocks: { [symbol: string]: StockData }, 
  isDailyView: boolean = false
): TreemapData {
  
  const positiveStocks: ProcessedStockData[] = [];
  const negativeStocks: ProcessedStockData[] = [];
  let sum: number = 0;

  // Process each stock from the stocks object
  Object.entries(stocks).forEach(([ticker, stockData]) => {
    if (stockData.quantity === 0) {
      return; // Skip this stock if quantity is 0
    }
    const value: number = stockData.value;
    sum += value;

    // Calculate total gain/loss percentage
    const totalChangePercentage = (
      ((stockData.last_price - stockData.avg_bought_price) / stockData.avg_bought_price) * 100
    );

    // Use daily change percentage if available and in daily view
    const displayPercentage = isDailyView && stockData.daily_change_percent !== undefined
      ? stockData.daily_change_percent
      : totalChangePercentage;

    const processedStock: ProcessedStockData = {
      name: ticker,
      ticker: ticker,
      value,
      avgSharePrice: stockData.avg_bought_price,
      quantity: stockData.quantity,
      last_price: stockData.last_price,
      priceChangePercentage: displayPercentage,
      dailyChangePercentage: stockData.daily_change_percent,
    };

    // Group by the percentage we're displaying
    if (displayPercentage > 0) {
      positiveStocks.push(processedStock);
    } else {
      negativeStocks.push(processedStock);
    }
  });

  // Calculate percentage of portfolio
  const calculatePortfolioPercentage = (stocksArray: ProcessedStockData[]): void => {
    stocksArray.forEach((stock: ProcessedStockData) => {
      stock.percentageOfPortfolio = ((stock.value / sum) * 100);
    });
  };

  calculatePortfolioPercentage(positiveStocks);
  calculatePortfolioPercentage(negativeStocks);

  // Build the final tree structure
  const newStocksTree: TreemapData = {
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




export function processAllocationData(
  alloc: AllocationDTO,
  view: AllocationView = "assetClass",
  topN = 8
): DonutDatum[] {
  const longSide = alloc[view].long;
  const total = Object.values(longSide).reduce((a, b) => a + b, 0);

  const entries = Object.entries(longSide)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({
      name,
      value,
      percentageOfPortfolio: +(100 * value / total).toFixed(2),
    }));

  if (entries.length <= topN) return entries;

  const head = entries.slice(0, topN);
  const othersValue = entries.slice(topN).reduce((a, d) => a + d.value, 0);

  return [
    ...head,
    {
      name: "Others",
      value: othersValue,
      percentageOfPortfolio: +(100 * othersValue / total).toFixed(2),
    },
  ];
}

// Donut Data Processing
export type DonutData = {
  name: string;
  value: number;
  quantity: number;
  percentageOfPortfolio: number;
  othersStocks?: any[];
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
    if (
      stockData.quantity === 0 ||
      !stockData.avg_bought_price ||
      stockData.avg_bought_price <= 0
    ) {
      return; // Skip this stock
    }
    // Skip if we don't have proper price data
    if (!stockData.avg_bought_price || stockData.avg_bought_price <= 0) return;

    const stock_avg_price: number = stockData.avg_bought_price;
    const current_price: number = stockData.last_price;
    const value: number = stockData.value; // Current market value
    const percentageChange = (
      ((current_price - stock_avg_price) / stock_avg_price) * 100
    );

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
  avgSharePrice: number;
  last_price: number;
  percentageOfPortfolio: number;
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
  let totalPortfolioValue: number = 0;

  const relevantStocks = Object.entries(stocks).filter(
    ([, stockData]) => stockData.quantity !== 0
  );

  relevantStocks.forEach(([, stockData]) => {
    totalPortfolioValue += stockData.value;
  });

  const children: StockChild[] = relevantStocks.map(([ticker, stockData]) => {
    const value: number = stockData.value;
    const percentageOfPortfolio =
      totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0;
    const stockType: string =
      stockData.last_price > stockData.avg_bought_price
        ? "positive"
        : "negative";

    return {
      type: "leaf",
      ticker,
      name: ticker,
      value,
      stockType,
      quantity: stockData.quantity,
      avgSharePrice: stockData.avg_bought_price,
      last_price: stockData.last_price,
      percentageOfPortfolio,
    };
  });

  return {
    type: "node",
    name: "stocks",
    value: totalPortfolioValue,
    children,
  };
}

export type leaderboardsStock ={
  ticker: string;
  name: string;
  value: number;
  priceChange: number;
  priceChangePercentage: number;
  sharePrice: number;
  earnings: string;
  quantity: number;
  percentageOfPortfolio: number;
  gainLoss: number;
}
export function processLeaderboardsData(stocks: { [symbol: string]: StockData }): leaderboardsStock[]{

  const relevantStocks = Object.entries(stocks).filter(
    ([, stockData]) => stockData.quantity !== 0
  );
  let totalPortfolioValue: number = 0;
  // Calculate total portfolio value from relevant stocks
  relevantStocks.forEach(([, stockData]) => {
    totalPortfolioValue += stockData.value;
  });

  // Process each stock
  const LeaderboardsData = relevantStocks
    .map(([ticker, stockData]) => {
      const priceChange: number =
        stockData.last_price - stockData.avg_bought_price;
      const priceChangePercentage =
        stockData.avg_bought_price !== 0
          ? ((stockData.last_price - stockData.avg_bought_price) /
              stockData.avg_bought_price) *
            100
          : 0;
      const percentageOfPortfolio =
        totalPortfolioValue > 0
          ? (stockData.value / totalPortfolioValue) * 100
          : 0;
      const gainLoss =
        stockData.value - stockData.avg_bought_price * stockData.quantity;

      return {
        ticker: ticker,
        name: ticker,
        value: stockData.value,
        priceChange,
        priceChangePercentage,
        sharePrice: stockData.last_price,
        earnings: "N/A",
        quantity: stockData.quantity,
        percentageOfPortfolio,
        gainLoss,
      };
    })
    .sort((a, b) => b.priceChangePercentage - a.priceChangePercentage);

  return LeaderboardsData;
}

// Format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

import { BusinessDay, Time } from 'lightweight-charts';

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