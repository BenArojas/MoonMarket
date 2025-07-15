// src/stores/stockStore.ts
import { Enabled } from "@tanstack/react-query";
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
export type AllocationView = "assetClass" | "sector" | "group";


/* -------------------------------- LedgerDTO ----------------------------- */

export interface LedgerEntry {
  secondKey: string;      
  cashbalance: number;    
  settledCash: number;
  unrealizedPnl: number;
  dividends: number;
  exchangeRate: number;
}

export interface LedgerDTO {
  baseCurrency: string;
  ledgers: LedgerEntry[];
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

/* --------------------------- AccountSummary DTO --------------------------- */
export interface BriefAccountInfo {
  accountId: string;
  accountTitle: string;
  displayName: string;
}

export interface OwnerInfoDTO {
  userName: string;
  entityName: string;
  roleId: string;
}

export interface AccountInfoDTO {
  accountId: string;
  accountTitle: string;
  accountType: string;
  tradingType: string;
  baseCurrency: string;
  ibEntity: string;
  clearingStatus: string;
  isPaper: boolean;
}

export interface PermissionsDTO {
  allowFXConv: boolean;
  allowCrypto: boolean;
  allowEventTrading: boolean;
  supportsFractions: boolean;
}

export interface AccountDetailsDTO {
  owner: OwnerInfoDTO;
  account: AccountInfoDTO;
  permissions: PermissionsDTO;
}


// --- 1. Define the state and action types ---
export interface StockData {
  symbol: string;
  last_price: number;
  avg_bought_price: number;
  quantity: number;
  value: number;
  unrealizedPnl: number;
  daily_change_percent?: number; 
  daily_change_amount?: number; 
}

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
  daily_change_percent?: number;  
  daily_change_amount?: number;  
}

interface StockState {
  // State
  stocks: { [symbol: string]: StockData };
  watchlists: WatchlistDict;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  error?: string;
  allocation?: AllocationDTO;
  allocationView: AllocationView;
  accountDetails: AccountDetailsDTO | null;
  balances: LedgerDTO | null;
  pnl: Record<string, PnlRow>;             
  coreTotals: {                          
    dailyRealized: number;
    unrealized: number;
    netLiq: number;
  };
  allAccounts: BriefAccountInfo[];
  selectedAccountId: string | null;
  areAiFeaturesEnabled: boolean| null;

  // Actions
  setPnl: (rows: Record<string, PnlRow>) => void;
  setAreAiFeaturesEnabled: (enabled:boolean) => void
  setAllocation: (a: AllocationDTO) => void;
  setAllocationView: (v: AllocationView) => void;
  setAccountDetails: (details: AccountDetailsDTO) => void;
  setBalances: (balances: LedgerDTO) => void;
  setAllAccounts: (accounts: BriefAccountInfo[]) => void;
  setSelectedAccountId: (accountId: string) => void;
  setConnectionStatus: (status: StockState["connectionStatus"]) => void;
  setError: (errorMsg: string) => void;
  clearError: () => void;
  updateStock: (data: FrontendMarketDataUpdate) => void;
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
  allocation: undefined,
  allocationView: "assetClass",
  coreTotals: { dailyRealized: 0, unrealized: 0, netLiq: 0 },
  connectionStatus: "disconnected",
  error: undefined,
  accountDetails: null,
  balances: null,
  allAccounts: [],
  selectedAccountId: null,
  areAiFeaturesEnabled: null,

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
  setAreAiFeaturesEnabled: (enabled) => set({ areAiFeaturesEnabled: enabled }),
  setAccountDetails: (details) => set({ accountDetails: details }),
  setBalances: (balances) => set({ balances }),
  setAllAccounts: (accounts) => set({ allAccounts: accounts }),
  setSelectedAccountId: (accountId) => set({ selectedAccountId: accountId }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (errorMsg) => set({ error: errorMsg, connectionStatus: "error" }),
  clearError: () => set({ error: undefined }),
  setWatchlists: (data) => set({ watchlists: data }),
  setAllocation: (data) => set({ allocation: data }),
  setAllocationView: (v) => set({ allocationView: v }),

  updateStock: (data: FrontendMarketDataUpdate) =>
    set(state => {
      const prev = state.stocks[data.symbol] ?? {};
      const qty = data.quantity ?? prev.quantity ?? 0;
  
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
            daily_change_percent: data.daily_change_percent ?? prev.daily_change_percent,
            daily_change_amount: data.daily_change_amount ?? prev.daily_change_amount,
          },
        },
      };
    }),

  clearAllData: () =>
    set({
      stocks: {},
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
    // console.log("got a msg", msg)

    switch (msg.type) {
      case "market_data":
        get().updateStock(msg);
        break;

      case "account_summary":
        // todo
        break;
        
      case "pnl":           
        get().setPnl(msg.data);
        break;

      case "ledger":
        get().setBalances(msg.data);
        break;

      case "allocation":
        get().setAllocation(msg.data);
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
