// hooks/useTransactionSummary.js
import { useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { calculateTransactionSummary} from '@/utils/dataProcessing'

export const useTransactionSummary = () => {
  const { transactions, holdings, stocks } = useLoaderData();

  // Create a map of current stock prices
  const currentStockPrices = useMemo(() => {
    return stocks.reduce((acc, stock) => {
      acc[stock.ticker] = stock.price;
      return acc;
    }, {});
  }, [stocks]);

  const summaryData = useMemo(() => {
    return calculateTransactionSummary(transactions, holdings, currentStockPrices);
  }, [transactions, holdings, currentStockPrices]);

  return summaryData;
};

