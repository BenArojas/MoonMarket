// src/stores/stockStore.ts
import { toast } from "react-toastify";
import { create } from "zustand";

/* -------------------------------- AllocationDTO ------------------------- */

export interface LongShort {
  long: Record<string, number>;   // e.g. { STK: 12345.67, OPT: 9876 }
  short: Record<string, number>;  // (may be an empty object)
}

export interface AllocationDTO {
  assetClass: LongShort;          // STK / OPT / CASH …
  sector: LongShort;              // Technology / Financial …
  group: LongShort;               // Semiconductors / Banks …
}

/* -------------------------------- LedgerDTO ----------------------------- */

export interface LedgerCurrencyDTO {
  currency: string;               // "USD" | "EUR" | "BASE" | …
  cashBalance: number;            // cashbalance
  unrealizedPnl: number;          // unrealized_pnl (camel-cased)
  realizedPnl: number;            // realized_pnl
  netLiquidationValue: number;    // net_liquidation_value
  timestamp: number;              // epoch seconds
}

export interface LedgerDTO {
  currencies: LedgerCurrencyDTO[];
}

/* -------------------------------- ComboDTO ------------------------------ */

export interface ComboLegDTO {
  conid: number;
  ratio: number;                  // positive or negative
}

export interface ComboPositionLegDTO {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  assetClass: string;             // "OPT", "STK", …
}

export interface ComboDTO {
  name: string;                   // internal combo id
  description: string;            // "1*708474422-1*710225103" …
  legs: ComboLegDTO[];
  positions: ComboPositionLegDTO[];
}

/* --------------------------- PnL DTO --------------------------- */
export interface PnlRow {
  rowType: number;    // always 1 (single account)
  dpl: number;        // daily realised P&L
  nl: number;         // net liquidity
  upl: number;        // unrealised P&L
  uel: number;        // excess liquidity (un-rounded)
  mv: number;         // margin value
}


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
  total_cash_value: number;
  buying_power: number;
};
type WatchlistDict = Record<string, string>;

interface FrontendMarketDataUpdate {
  type: "market_data";
  conid: number;
  symbol: string;
  last_price: number;
  quantity?: number;
  avg_bought_price?: number;
  value?: number;
  unrealized_pnl?: number;
}

interface StockState {
  // State
  stocks: { [symbol: string]: StockData };
  accountSummary: AccountSummaryData;
  watchlists: WatchlistDict;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  error?: string;
  allocation?: AllocationDTO;
  ledger?: LedgerDTO;
  combos?: ComboDTO[];
  pnl: Record<string, PnlRow>;             // ⬅️ NEW – keyed by "U1234567.Core"
  coreTotals: {                            // ⬅️ convenience slice for UI
    dailyRealized: number;
    unrealized: number;
    netLiq: number;
  };
  setPnl: (rows: Record<string, PnlRow>) => void;
  setAllocation: (a: AllocationDTO) => void;
  setLedger: (l: LedgerDTO) => void;
  setCombos: (c: ComboDTO[]) => void;

  // Actions
  setConnectionStatus: (status: StockState["connectionStatus"]) => void;
  setError: (errorMsg: string) => void;
  clearError: () => void;
  updateStock: (data: FrontendMarketDataUpdate) => void;
  setAccountSummary: (data: any) => void;
  setWatchlists: (w: WatchlistDict) => void;
  clearAllData: () => void;

  // Connection management actions
  connect: () => void;
  disconnect: () => void;
}

// --- 2. Create the store ---
export const useStockStore = create<StockState>((set, get) => ({
  // Default State
  stocks: {},
  watchlists: {},
  accountSummary: {
    net_liquidation: 0,
    total_cash_value: 0,
    buying_power: 0,
  },
  pnl: {},
  coreTotals: { dailyRealized: 0, unrealized: 0, netLiq: 0 },
  connectionStatus: "disconnected",
  error: undefined,

  // Actions
  setPnl: (rows) => {
    // Pull the first *.Core row (default model) for quick widgets
    const coreKey = Object.keys(rows).find((k) => k.endsWith(".Core"));
    const core = coreKey ? rows[coreKey] : undefined;

    set({
      pnl: rows,
      coreTotals: core
        ? {
            dailyRealized: core.dpl,
            unrealized: core.upl,
            netLiq: core.nl,
          }
        : { dailyRealized: 0, unrealized: 0, netLiq: 0 },
    });
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (errorMsg) => set({ error: errorMsg, connectionStatus: "error" }),
  clearError: () => set({ error: undefined }),
  setAccountSummary: (data) => set({ accountSummary: data }),
  setWatchlists: (data) => set({ watchlists: data }),
  setAllocation: (data) => set({ allocation: data }),
  setLedger: (data) => set({ ledger: data }),
  setCombos: (data) => set({ combos: data }),

  updateStock: (data: FrontendMarketDataUpdate) =>
    set(state => {
      const prev = state.stocks[data.symbol] ?? {};
      const qty  = data.quantity ?? prev.quantity ?? 0;
  
      return {
        stocks: {
          ...state.stocks,
          [data.symbol]: {
            symbol: data.symbol,
            last_price: data.last_price,
            quantity: qty,
            avg_bought_price: data.avg_bought_price ?? prev.avg_bought_price ?? 0,
            unrealizedPnl: data.unrealized_pnl ?? prev.unrealizedPnl ?? 0,
            value: data.value ?? data.last_price * qty,
          },
        },
      };
    }),

  clearAllData: () =>
    set({
      stocks: {},
      accountSummary: {
        net_liquidation: 0,
        total_cash_value: 0,
        buying_power: 0,
      },
      watchlists: {},
    }),

  // You can define actions that call other actions using get()
  connect: () => {
    // Call the external connection logic, defined below
    connectWebSocket(get);
  },
  disconnect: () => {
    disconnectWebSocket();
    // get().clearAllData();
    get().setConnectionStatus("disconnected");
  },
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

  get().setConnectionStatus("connecting");
  get().clearError();

  ws = new WebSocket("ws://localhost:8000/ws"); // Use env variable here

  ws.onopen = () => {
    console.log("WebSocket connected (Zustand)");
    reconnectAttempts = 0;
    get().setConnectionStatus("connected");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("got a msg", msg)

    switch (msg.type) {
      case "market_data":
        get().updateStock(msg);
        break;

      case "account_summary":
        get().setAccountSummary(msg.data);
        break;
        
      case "pnl":           
        get().setPnl(msg.data);
        break;

      case "ledger":
        get().setLedger({ currencies: msg.data });
        break;

      case "allocation":
        get().setAllocation(msg.data);
        break;

      case "combos":
        get().setCombos(msg.data);
        break;

      case "watchlists":
        get().setWatchlists(msg.data);
        break;

      case "error":
        get().setError(msg.message);
        break;
    }
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    get().setConnectionStatus("disconnected");

    // Auto-reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      console.log(`Attempting to reconnect in ${delay}ms...`);
      reconnectTimeout = setTimeout(() => get().connect(), delay);
    } else {
      get().setError("Max reconnection attempts reached.");
    }
  };

  ws.onerror = () => {
    get().setError("WebSocket connection error.");
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
