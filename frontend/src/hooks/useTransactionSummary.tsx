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

// Define interface for Transaction based on console.log output
export interface Transaction {
  // commission: number;
  conid: number;
  price: number;
  quantity: number;
  text: string;
  ticker: string;
  transaction_date: string;
  type: 'sale' | 'purchase'; // Assuming type can be 'sale' or 'purchase'
}



// Define props interface for the hook
interface TransactionSummaryProps {
  transactions: Transaction[];
  // stocks: Stock[];
}

export const useTransactionSummary = ({ transactions }: TransactionSummaryProps) => {


  const summaryData = useMemo(() => {
    return calculateTransactionSummary(transactions);
  }, [transactions]);

  return summaryData;
};