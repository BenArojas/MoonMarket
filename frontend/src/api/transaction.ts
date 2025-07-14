import api from "@/api/axios";




// From POST /pa/transactions
export interface IbkrTransaction {
  date: string; // "Mon Dec 11 00:00:00 EST 2023"
  cur: string;
  pr: number; // price
  qty: number; // positive for buy, negative for sell
  acctid: string;
  amt: number; // total value of the trade
  conid: number;
  type: 'Buy' | 'Sell' | string; // Can be other types like 'Dividend'
  desc: string; // "Apple Inc"
}

export interface IbkrPnlData {
    date: string; // "20231211"
    side: 'L' | 'G'; // Loss or Gain
    amt: string; // amount as string
    conid: string;
}


export async function getIbkrTransactionHistory(days: number = 90): Promise<{ transactions: IbkrTransaction[], pnl: IbkrPnlData[] }> {
  const { data } = await api.get(
    "/transactions",
    { params: { days } }          // backend default is also 90 so this is optional
  );
  return data;
}


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

  // // This endpoint is simpler and fetches all trades in one go.
  // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // // Mock response for GET /iserver/account/trades
  // return [
  //     { execution_id: "0000e0d5.6576fd38.01.01", symbol: "AAPL", side: "B", order_description: "Bought 10 @ 195.50", trade_time_r: new Date("2024-06-10T10:00:00-04:00").getTime(), size: 10, price: "195.50", commission: "1.00", net_amount: 1956.00, company_name: "APPLE INC", conid: 265598, sec_type: "STK" },
  //     { execution_id: "0000e0d5.6576fd39.01.02", symbol: "TSLA", side: "B", order_description: "Bought 5 @ 180.11", trade_time_r: new Date("2024-05-17T14:30:00-04:00").getTime(), size: 5, price: "180.11", commission: "1.00", net_amount: 901.55, company_name: "TESLA, INC.", conid: 76792991, sec_type: "STK" },
  // ];
