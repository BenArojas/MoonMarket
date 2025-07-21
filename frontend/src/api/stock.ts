import api from "@/api/axios";
import { ChartDataPoint } from "@/components/charts/AreaChartLw";
import { Time } from "lightweight-charts";


export type StockData = {
  last_price: number;
  previous_close: number;
  change_amount: number
  change_percent: number;
  calculated_change_percent: number
  dayHigh: number;
  dayLow: number;
  ticker: string
}

export async function getStockData(ticker: string) {
  const stock = await api.get(
    `/market/quote/${ticker}`
  );
    return stock.data;
}

export type ChartDataBars = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const fetchHistoricalStockDataBars = async (
  ticker: string,
  period: string
): Promise<ChartDataBars[]> => {
  try {
    const response = await api.get("/market/history", {
      params: {
        ticker,
        period,
      },
    });
    return response.data as ChartDataBars[];
  } catch (error) {
    console.error("Error fetching historical stock data:", error);
    // Re-throw the error so react-query can catch it and set the error state
    throw error;
  }
};
/**
 * Fetches historical stock data from the backend API using conid.
 * @param conid The contract ID of the stock.
 * @param period The period for which to fetch data (e.g., "7D", "1M").
 * @returns A promise that resolves to an array of ChartDataPoint.
 */
export const fetchHistoricalStockData = async (
  conid: number,
  period: string
): Promise<ChartDataPoint[]> => {
  const { data } = await api.get<ChartDataBars[]>("/market/history", {
    // Pass conid instead of ticker
    params: { conid, period },
  });

  return data.map(({ time, close }) => ({
    time: time as unknown as Time,
    value: close,
  }));
};

// This function will fetch the initial quote to get the conid
export const fetchConidForTicker = async (ticker: string): Promise<{ conid: number; companyName: string }> => {
  const { data } = await api.get(`/market/conid/${ticker}`);
  return data;
};