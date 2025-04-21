import React from 'react';
import { useTheme } from '@mui/material/styles';

const AddStockModal = ({ 
  showAddStockModal,
  setShowAddStockModal,
  newStockTicker,
  setNewStockTicker,
  handleAddToWatchlist,
  toggleWatchlistMutation
}) => {
  const theme = useTheme();

  if (!showAddStockModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="p-6 rounded shadow-lg w-full max-w-sm" style={{ backgroundColor: theme.palette.background.paper }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.palette.text.primary }}>Add Stock to Watchlist</h3>
        <div className="mb-4">
          <label htmlFor="tickerInput" className="block text-sm font-medium mb-1" style={{ color: theme.palette.text.secondary }}>Ticker Symbol</label>
          <input
            id="tickerInput"
            type="text"
            value={newStockTicker}
            onChange={(e) => setNewStockTicker(e.target.value.toUpperCase().trim())}
            className="block w-full p-2 rounded border"
            style={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider
            }}
            placeholder="e.g., AAPL, MSFT"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowAddStockModal(false)}
            className="px-4 py-2 rounded"
            style={{
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              backgroundColor: 'transparent'
            }}
            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
          >
            Cancel
          </button>
          <button
            onClick={handleAddToWatchlist}
            className="px-4 py-2 rounded"
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              opacity: !newStockTicker || toggleWatchlistMutation.isPending ? 0.6 : 1
            }}
            disabled={!newStockTicker || toggleWatchlistMutation.isPending}
          >
            {toggleWatchlistMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;