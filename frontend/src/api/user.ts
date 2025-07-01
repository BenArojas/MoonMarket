import api from "@/api/axios";
import { ChartDataPoint } from "@/components/LwAreaChart";
import { AccountDetailsDTO, LedgerDTO } from "@/stores/stockStore";
import { Dayjs } from "dayjs";
import { Time } from "lightweight-charts";
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




export interface NAVSeries   { dates: string[]; navs: number[] }
export interface ReturnSeries{ dates: string[]; returns: number[] }

export interface Performance {
  nav:  NAVSeries;
  cps:  ReturnSeries;
  tpps: ReturnSeries;
}

export async function fetchPerformance(period = "1Y"): Promise<Performance> {
  const { data } = await api.get<Performance>("/account/performance", {
    params: { period },
  });
  return data;
}


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
    const response = await api.get('/market/history', {
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
  const { data } = await api.get<ChartDataBars[]>('/market/history', {
    params: { ticker, period },
  });

  // Pick the field you want to plot – here I’m using `close`
  return data.map(({ time, close }) => ({
    time: (time as unknown) as Time, // or convert to the exact Time type you need
    value: close,
  }));
};

/**
 * Fetches consolidated account details from the backend.
 */
export async function fetchAccountDetails(): Promise<AccountDetailsDTO> {
  const { data } = await api.get<AccountDetailsDTO>(`/account/account-details`);
  return data;
}

/**
 * Fetches the detailed, multi-currency balance ledger.
 */
export async function fetchBalances(): Promise<LedgerDTO> {
  // Assuming your endpoint is /ledger and takes an 'acct' query param
  const { data } = await api.get<LedgerDTO>('/account/ledger');
  return data;
}