import api from "@/api/axios";


export interface IbkrTrade {
  execution_id: string;
  symbol: string;
  side: 'B' | 'S'; // Buy or Sell
  order_description: string;
  trade_time_r: number; // epoch time
  size: number;
  price: string;
  commission: string;
  net_amount: number;
  company_name: string;
  conid: number;
  sec_type: 'STK' | 'OPT' | string;
}

export async function getIbkrRecentTrades(days: number = 7): Promise<IbkrTrade[]> {
  const { data } = await api.get("/transactions/trades",
    { params: { days } }  
  )
  return data;
}