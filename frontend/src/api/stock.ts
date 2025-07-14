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
 * Fetches historical stock data from the backend API.
 * @param ticker The stock ticker symbol (e.g., "BTC", "AAPL").
 * @param period The period for which to fetch data (e.g., "7D", "1M").
 * @returns A promise that resolves to an array of ChartDataPoint.
 * @throws Will throw an error if the API request fails.
 */
export const fetchHistoricalStockData = async (
  ticker: string,
  period: string
): Promise<ChartDataPoint[]> => {
  const { data } = await api.get<ChartDataBars[]>("/market/history", {
    params: { ticker, period },
  });

  // Pick the field you want to plot – here I’m using `close`
  return data.map(({ time, close }) => ({
    time: time as unknown as Time, // or convert to the exact Time type you need
    value: close,
  }));
};
