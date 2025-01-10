import { useMemo } from 'react';
import { calculateTransactionSummary } from '@/utils/dataProcessing'

export const useTransactionSummary = ({ transactions, stocks }) => {
  // Create a map of current stock prices
  const currentStockPrices = useMemo(() => {
    return stocks.reduce((acc, stock) => {
      acc[stock.ticker] = stock.price;
      return acc;
    }, {});
  }, [stocks]);

  const summaryData = useMemo(() => {
    return calculateTransactionSummary(transactions, currentStockPrices);
  }, [transactions, currentStockPrices]);

  return summaryData;
};