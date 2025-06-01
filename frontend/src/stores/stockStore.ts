// src/stores/stockStore.ts
import { create } from 'zustand';

// --- 1. Define the state and action types ---
export interface StockData {
  symbol: string;
  last_price: number;
  avg_bought_price: number;
  quantity: number;
  value: number;
  unrealizedPnl: number;
}
export type AccountSummaryData = {
  net_liquidation: number;
  total_cash_value: number
  buying_power: number
}
interface StockState {
  // State
  stocks: { [symbol: string]: StockData };
  accountSummary: AccountSummaryData
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;

  // Actions
  setConnectionStatus: (status: StockState['connectionStatus']) => void;
  setError: (errorMsg: string) => void;
  clearError: () => void;
  updateStock: (data: any) => void;
  setAccountSummary: (data: any) => void;
  clearAllData: () => void;

  // Connection management actions
  connect: () => void;
  disconnect: () => void;
}

// --- 2. Create the store ---
export const useStockStore = create<StockState>((set, get) => ({
  // Default State
  stocks: {},
  accountSummary: {
    net_liquidation: 0,
    total_cash_value: 0,
    buying_power: 0
  },
  connectionStatus: 'disconnected',
  error: undefined,

  // Actions
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (errorMsg) => set({ error: errorMsg, connectionStatus: 'error' }),
  clearError: () => set({ error: undefined }),
  setAccountSummary: (data) => set({ accountSummary: data }),

  updateStock: (data) => {
    set(state => ({
      stocks: {
        ...state.stocks,
        [data.symbol]: {
          symbol: data.symbol,
          last_price: data.last_price,
          avg_bought_price: data.avg_bought_price,
          quantity: data.quantity,
          value: data.value,
          unrealizedPnl: data.unrealized_pnl,
        }
      }
    }))
  },

  clearAllData: () => set({
    stocks: {}, accountSummary: {
      net_liquidation: 0,
      total_cash_value: 0,
      buying_power: 0
    }
  }),

  // You can define actions that call other actions using get()
  connect: () => {
    // Call the external connection logic, defined below
    connectWebSocket(get);
  },
  disconnect: () => {
    disconnectWebSocket();
    get().clearAllData();
    get().setConnectionStatus('disconnected');
  }
}));


// --- 3. Manage WebSocket Logic outside the store ---
// This keeps the store definition clean.

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket(get: () => StockState) {
  // Prevent multiple connections
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    return;
  }

  get().setConnectionStatus('connecting');
  get().clearError();

  ws = new WebSocket('ws://localhost:8765'); // Use env variable here

  ws.onopen = () => {
    console.log('WebSocket connected (Zustand)');
    reconnectAttempts = 0;
    get().setConnectionStatus('connected');
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'market_data':
        get().updateStock(message);
        break;
      case 'account_summary':
        get().setAccountSummary(message.data);

        break;
      case 'error':
        get().setError(message.message);
        break;
      default:
        break;
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    get().setConnectionStatus('disconnected');

    // Auto-reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      console.log(`Attempting to reconnect in ${delay}ms...`);
      reconnectTimeout = setTimeout(() => get().connect(), delay);
    } else {
      get().setError('Max reconnection attempts reached.');
    }
  };

  ws.onerror = () => {
    get().setError('WebSocket connection error.');
  };
}

function disconnectWebSocket() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (ws) {
    ws.onclose = null; // prevent reconnect logic on manual close
    ws.close();
    ws = null;
  }
}