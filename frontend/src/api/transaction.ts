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
  quantity: number; // Mapped from remainingQuantity
  limitPrice: string; // Mapped from price
  status: string;
  orderDesc: string; // e.g., "Buy 1 TSLA Limit 200.00, Day"
  conid: number;
}

export const getLiveOrders = async (): Promise<LiveOrder[]> => {
  // 1. Expect the response data to be an array directly.
  const { data } = await api.get<any[]>("/transactions/live-orders");

  // 2. Validate that the data is an array before trying to map it.
  if (!Array.isArray(data)) {
    return [];
  }

  // 3. Map the 'data' array directly.
  return data.map((order: any): LiveOrder => ({
    orderId: order.orderId,
    ticker: order.ticker,
    side: order.side,
    orderType: order.orderType,
    quantity: order.remainingQuantity,
    limitPrice: order.price,
    status: order.status,
    orderDesc: order.orderDesc,
    conid: order.conid,
  }));
};

export interface ModifyOrderPayload {
  orderId: number;
  newOrderData: {
    price?: number;
    quantity?: number;
  };
  accountId: string;
}

export interface CancelOrderPayload {
  orderId: number;
  accountId: string;
}

export const cancelOrder = async ({ orderId, accountId }: CancelOrderPayload) => {
  // Add the accountId as a URL query parameter
  await api.delete(`/transactions/orders/${orderId}`, {
    params: { accountId },
  });
};

export const modifyOrder = async ({ orderId, newOrderData, accountId }: ModifyOrderPayload) => {
  // Send newOrderData in the body and accountId as a URL query parameter
  await api.post(`/transactions/orders/${orderId}`, newOrderData, {
    params: { accountId },
  });
};