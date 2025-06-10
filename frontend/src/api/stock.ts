import api from "@/api/axios";

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

