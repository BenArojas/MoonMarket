// src/stores/stockStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
/* -------------------------------- AllocationDTO ------------------------- */

export interface LongShort {
  long: Record<string, number>; // e.g. { STK: 12345.67, OPT: 9876 }
  short: Record<string, number>; // (may be an empty object)
}

export interface AllocationDTO {
  assetClass: LongShort; // STK / OPT / CASH …
  sector: LongShort; // Technology / Financial …
  group: LongShort; // Semiconductors / Banks …
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
  rowType: number; // always 1 (single account)
  dpl: number; // daily realised P&L
  nl: number; // net liquidity
  upl: number; // unrealised P&L
  uel: number; // excess liquidity (un-rounded)
  mv: number; // margin value
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

// For the live quote data on the stock page
export interface Quote {
  lastPrice?: number;
  bid?: number;
  ask?: number;
  changePercent?: number;
  changeAmount?: number;
  dayHigh?: number;
  dayLow?: number;
}

export interface PriceLadderRow {
  price: number;
  bidSize?: number;
  askSize?: number;
}

interface StockState {
  // State
  stocks: { [symbol: string]: StockData };
  activeStock: {
    conid: number | null;
    ticker: string | null;
    quote: Quote;
    depth: PriceLadderRow[];
  };
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
  areAiFeaturesEnabled: boolean | null;

  // Actions
  subscribeToStock: (conid: number, ticker: string) => void;
  subscribeToPortfolio: () => void;
  unsubscribeFromPortfolio: () => void;
  unsubscribeFromStock: (conid: number) => void;
  updateActiveQuote: (data: any) => void;
  updateActiveDepth: (data: PriceLadderRow[]) => void;
  clearActiveStock: () => void;
  setPnl: (rows: Record<string, PnlRow>) => void;
  setAreAiFeaturesEnabled: (enabled: boolean) => void;
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

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      // --- Start of your state and actions object ---

      // Default State
      stocks: {},
      activeStock: {
        conid: null,
        ticker: null,
        quote: {},
        depth: [],
      },
      watchlists: {},
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
      
      // ... (all your other actions like setPnl, etc. remain here, unchanged)
      setPnl: (rows) => {
        const coreKey = Object.keys(rows).find((k) => k.endsWith(".Core"));
        const core = coreKey ? rows[coreKey] : undefined;
        set({
          pnl: rows,
          coreTotals: core
            ? { dailyRealized: core.dpl, unrealized: core.upl, netLiq: core.nl }
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
      subscribeToPortfolio: () => {
        const accountId = get().selectedAccountId;
        if (ws && ws.readyState === WebSocket.OPEN && accountId) {
          ws.send(JSON.stringify({ action: "subscribe_portfolio", account_id: accountId }));
        }
      },
      unsubscribeFromPortfolio: () => {
        const accountId = get().selectedAccountId;
        if (ws && ws.readyState === WebSocket.OPEN && accountId) {
          ws.send(JSON.stringify({ action: "unsubscribe_portfolio", account_id: accountId }));
        }
      },
      subscribeToStock: (conid, ticker) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          set({ activeStock: { conid, ticker, quote: {}, depth: [] } });
          const command = { action: "subscribe_stock", conid };
          ws.send(JSON.stringify(command));
          console.log(`Sent command to subscribe to conid: ${conid}`);
        }
      },
      unsubscribeFromStock: (conid) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const command = { action: "unsubscribe_stock", conid };
          ws.send(JSON.stringify(command));
          console.log(`Sent command to unsubscribe from conid: ${conid}`);
          get().clearActiveStock();
        }
      },
      updateActiveQuote: (data) =>
        set((state) => ({
          activeStock: {
            ...state.activeStock,
            quote: {
              lastPrice: data["31"] ?? state.activeStock.quote.lastPrice,
              bid: data["84"] ?? state.activeStock.quote.bid,
              ask: data["86"] ?? state.activeStock.quote.ask,
              changeAmount: data["82"] ?? state.activeStock.quote.changeAmount,
              changePercent: data["83"] ?? state.activeStock.quote.changePercent,
              dayHigh: data["70"] ?? state.activeStock.quote.dayHigh,
              dayLow: data["71"] ?? state.activeStock.quote.dayLow,
            },
          },
        })),
      updateActiveDepth: (data) =>
        set((state) => ({
          activeStock: { ...state.activeStock, depth: data },
        })),
      clearActiveStock: () =>
        set({
          activeStock: { conid: null, ticker: null, quote: {}, depth: [] },
        }),
      updateStock: (data: FrontendMarketDataUpdate) =>
        set((state) => {
          const prev = state.stocks[data.symbol] ?? {};
          const qty = data.quantity ?? prev.quantity ?? 0;
          return {
            stocks: {
              ...state.stocks,
              [data.symbol]: {
                symbol: data.symbol,
                last_price: data.last_price,
                quantity: qty,
                avg_bought_price:
                  data.avg_bought_price ?? prev.avg_bought_price ?? 0,
                unrealizedPnl: data.unrealized_pnl ?? prev.unrealizedPnl ?? 0,
                value: data.value ?? data.last_price * qty,
                daily_change_percent:
                  data.daily_change_percent ?? prev.daily_change_percent,
                daily_change_amount:
                  data.daily_change_amount ?? prev.daily_change_amount,
              },
            },
          };
        }),
      clearAllData: () =>
        set({
          stocks: {},
          watchlists: {},
        }),
      connect: () => {
        connectWebSocket(get);
      },
      disconnect: () => {
        disconnectWebSocket();
        get().setConnectionStatus("disconnected");
      },
    }),
    // --- End of your state and actions object ---
    
    // --- CHANGED: Configuration object for persist middleware ---
    {
      name: "stock-storage", // Unique name for localStorage key
      
      // Selectively save only the data that needs to persist
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        watchlists: state.watchlists,
        allocationView: state.allocationView,
        areAiFeaturesEnabled: state.areAiFeaturesEnabled,
      }),

    }
  )
);



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

  const selectedAccountId = get().selectedAccountId;
  if (!selectedAccountId) {
    get().setError("Cannot connect WebSocket without a selected account.");
    return;
  }
  //use env var here
  ws = new WebSocket(`ws://localhost:8000/ws?accountId=${selectedAccountId}`);

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
        // This is a key change: we check if the update is for our
        // active stock or for the general portfolio.
        if (msg.conid && msg.conid === get().activeStock.conid) {
          get().updateActiveQuote(msg);
        } else {
          get().updateStock(msg); // The original behavior for portfolio stocks
        }
        break;

      case "book_data":
        get().updateActiveDepth(msg.data);
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
