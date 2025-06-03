import api from "@/api/axios";
import { ChartDataPoint } from "@/components/CurrentStockChart";
import { Dayjs } from "dayjs";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



export async function getUserInsights() {
  try {
    const response = await api.get("/user/ai/insights");
    return response;
  } catch (error) {
    console.error("API Error in getUserInsights:", error);
    throw error; // Re-throw to handle in fetchInsights
  }
}

export async function getStockSentiment(ticker: string) {
  try {
    const response = await api.get(
      `/user/ai/sentiment/${ticker.toUpperCase()}`
    );
    return response;
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    throw error; // Re-throw to handle in fetchInsights
  }
}





// Define the function that fetches the data
// This function will be called by useQuery
export const fetchPerformanceData = async (period: string): Promise<ChartDataPoint[]> => {
  const response = await api.get<ChartDataPoint[]>(`/account/performance-history`, {
    params: { period },
  });
  return response.data;
};



export type ChartDataBars = {
  time: number;
  open: number
  high: number
  low: number
  close: number
  volume: number 
}

export const fetchHistoricalStockDataBars = async (
  ticker: string,
  period: string
): Promise<ChartDataBars[]> => {
  try {
    const response = await api.get('/stocks/history', {
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
  try {
    const response = await api.get('/stocks/history', {
      params: {
        ticker,
        period,
      },
    });
    return response.data as ChartDataPoint[];
  } catch (error) {
    console.error("Error fetching historical stock data:", error);
    // Re-throw the error so react-query can catch it and set the error state
    throw error;
  }
};