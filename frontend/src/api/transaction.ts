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

export interface LiveOrder {
  orderId: number;
  ticker: string;
  side: "BUY" | "SELL";
  orderType: string;
  quantity: number;
  limitPrice: string;
  status: string;
  // ... add other relevant fields from the IBKR docs
}

export const getLiveOrders = async (): Promise<LiveOrder[]> => {
  const { data } = await api.get("/transactions/live-orders");
  return data;
};

export const cancelOrder = async (orderId: number) => {
  await api.delete(`/transactions/orders/${orderId}`);
};

export const modifyOrder = async ({ orderId, newOrderData }: { orderId: number, newOrderData: any }) => {
  await api.post(`/transactions/orders/${orderId}`, newOrderData);
};