// contexts/StockDataContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
export interface StockData {
  symbol: string;
  lastPrice: number;
  avgBoughtPrice: number;
  quantity: number;
  value: number;
  unrealizedPnl: number;
  lastUpdated: number;
  priceHistory: Array<{ price: number; timestamp: number }>;
}

interface StockState {
  stocks: { [symbol: string]: StockData };
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastUpdate: number;
  error?: string;
}

type StockAction = 
  | { type: 'UPDATE_STOCK'; payload: Omit<StockData, 'priceHistory' | 'lastUpdated'> }
  | { type: 'SET_CONNECTION_STATUS'; payload: StockState['connectionStatus'] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_ALL_STOCKS' };

// Reducer
const stockReducer = (state: StockState, action: StockAction): StockState => {
  switch (action.type) {
    case 'UPDATE_STOCK':
      const { symbol } = action.payload;
      const existingStock = state.stocks[symbol];
      const now = Date.now();
      
      return {
        ...state,
        stocks: {
          ...state.stocks,
          [symbol]: {
            ...action.payload,
            lastUpdated: now,
            priceHistory: [
              ...(existingStock?.priceHistory || []).slice(-50), // Keep last 50 points
              { price: action.payload.lastPrice, timestamp: now }
            ].filter((entry, index, arr) => 
              // Remove duplicates and keep only significant price changes
              index === 0 || Math.abs(entry.price - arr[index - 1].price) > 0.001
            )
          }
        },
        lastUpdate: now,
        error: undefined
      };
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        connectionStatus: 'error'
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined
      };
    
    case 'CLEAR_ALL_STOCKS':
      return {
        ...state,
        stocks: {},
        lastUpdate: 0
      };
    
    default:
      return state;
  }
};

// Context
interface StockDataContextType {
  stocks: { [symbol: string]: StockData };
  connectionStatus: StockState['connectionStatus'];
  lastUpdate: number;
  error?: string;
  getStock: (symbol: string) => StockData | undefined;
  getAllStocks: () => StockData[];
  getTotalValue: () => number;
  getTotalPnL: () => number;
  getStocksByPnL: () => StockData[];
  clearAllData: () => void;
  reconnect: () => void;
  clearError: () => void;
}

const StockDataContext = createContext<StockDataContextType | null>(null);

// Provider
interface StockDataProviderProps {
  children: ReactNode;
}

export const StockDataProvider: React.FC<StockDataProviderProps> = ({ children }) => {
  const { isAuth } = useAuth();
  const [state, dispatch] = useReducer(stockReducer, {
    stocks: {},
    connectionStatus: 'disconnected',
    lastUpdate: 0
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = () => {
    // Don't connect if not authenticated
    if (!isAuth) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    // Don't connect if already connecting or connected
    if (state.connectionStatus === 'connecting' || state.connectionStatus === 'connected') {
      return;
    }

    try {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timed out');
          ws.close();
          dispatch({ type: 'SET_ERROR', payload: 'Connection timeout' });
        }
      }, 10000);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        clearTimeout(connectionTimeout);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        
        // Send a test message to verify connection
        ws.send(JSON.stringify({ type: 'test', message: 'Frontend connected' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'market_data') {
            dispatch({
              type: 'UPDATE_STOCK',
              payload: {
                symbol: data.symbol,
                lastPrice: data.last_price,
                avgBoughtPrice: data.avg_bought_price,
                quantity: data.quantity,
                value: data.value,
                unrealizedPnl: data.unrealized_pnl
              }
            });
          } else if (data.type === 'error') {
            dispatch({ type: 'SET_ERROR', payload: data.message });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to parse message from server' });
        }
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
        
        // Auto-reconnect with exponential backoff if authenticated
        if (isAuth && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          dispatch({ type: 'SET_ERROR', payload: 'Max reconnection attempts reached' });
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
        dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection error' });
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create WebSocket connection' });
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    dispatch({ type: 'CLEAR_ALL_STOCKS' });
  };

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuth) {
      connectWebSocket();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuth]);

  // Helper functions
  const getStock = (symbol: string) => state.stocks[symbol];
  
  const getAllStocks = () => Object.values(state.stocks);
  
  const getTotalValue = () => 
    Object.values(state.stocks).reduce((total, stock) => total + stock.value, 0);
  
  const getTotalPnL = () => 
    Object.values(state.stocks).reduce((total, stock) => total + stock.unrealizedPnl, 0);
  
  const getStocksByPnL = () => 
    Object.values(state.stocks).sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
  
  const clearAllData = () => dispatch({ type: 'CLEAR_ALL_STOCKS' });
  
  const reconnect = () => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connectWebSocket, 1000);
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  const contextValue: StockDataContextType = {
    stocks: state.stocks,
    connectionStatus: state.connectionStatus,
    lastUpdate: state.lastUpdate,
    error: state.error,
    getStock,
    getAllStocks,
    getTotalValue,
    getTotalPnL,
    getStocksByPnL,
    clearAllData,
    reconnect,
    clearError
  };

  return (
    <StockDataContext.Provider value={contextValue}>
      {children}
    </StockDataContext.Provider>
  );
};

// Hook
export const useStockData = (): StockDataContextType => {
  const context = useContext(StockDataContext);
  if (!context) {
    throw new Error('useStockData must be used within a StockDataProvider');
  }
  return context;
};