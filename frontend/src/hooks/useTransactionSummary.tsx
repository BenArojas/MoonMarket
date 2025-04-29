import { useMemo } from 'react';
import { calculateTransactionSummary } from '@/utils/dataProcessing'

// Define interface for Stock based on console.log output
interface Stock {
  _id: string;
  name: string;
  ticker: string;
  price: number;
  earnings: string | null;
  last_updated: string;
}

// Define interface for User in Transaction
interface User {
  id: string;
  collection: string;
}

// Define interface for Transaction based on console.log output
export interface Transaction {
  _id: string;
  commission: number;
  name: string;
  price: number;
  quantity: number;
  text: string;
  ticker: string;
  title: string;
  transaction_date: string;
  type: 'sale' | 'purchase'; // Assuming type can be 'sale' or 'purchase'
  user_id: User;
}



// Define props interface for the hook
interface TransactionSummaryProps {
  transactions: Transaction[];
  stocks: Stock[];
}

export const useTransactionSummary = ({ transactions, stocks }: TransactionSummaryProps) => {

  // Create a map of current stock prices
  const currentStockPrices = useMemo(() => {
    return stocks.reduce((acc: Record<string, number>, stock) => {
      acc[stock.ticker] = stock.price;
      return acc;
    }, {});
  }, [stocks]);

  const summaryData = useMemo(() => {
    return calculateTransactionSummary(transactions, currentStockPrices);
  }, [transactions, currentStockPrices]);

  return summaryData;
};