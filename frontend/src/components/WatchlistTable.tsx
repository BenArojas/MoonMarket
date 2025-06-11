import { useTheme } from '@mui/material/styles';
import { StockData } from '@/pages/Watchlist';

/* ---------- props ---------- */
export interface WatchlistTableProps {
  watchlist: string[];
  stocksData: StockData[] | undefined;
  timeRange: string;

  /* simulation */
  localQuantities: Record<string, number>;
  handleQuantityChange: (ticker: string, quantityStr: string) => void;
}

/* ---------- component ---------- */
const WatchlistTable: React.FC<WatchlistTableProps> = ({
  watchlist,
  stocksData,
  timeRange,
  localQuantities,
  handleQuantityChange,
}) => {
  const theme = useTheme();

  /* --- helpers --- */
  const pct = (s: number, e: number) => (s ? ((e - s) / s) * 100 : 0);

  const perf = (ticker: string) => {
    const sd = stocksData?.find((s) => s.ticker === ticker);
    if (!sd?.historical?.length) return { ch: 0, pct: 0, price: 0 };

    const first = sd.historical[0].price;
    const last  = sd.historical.at(-1)!.price;
    return {
      ch: last - first,
      pct: pct(first, last),
      price: last,
    };
  };

  if (!watchlist.length) {
    return (
      <p className="text-center py-4" style={{ color: theme.palette.text.secondary }}>
        No symbols in this watch-list.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor: theme.palette.divider }}>
        <thead
          style={{
            backgroundColor:
              theme.palette.mode === 'dark'
                ? theme.palette.background.paper
                : 'rgba(0,0,0,0.04)',
          }}
        >
          <tr>
            {['Ticker', 'Last Price', `Change (${timeRange})`, 'Sim Qty', 'Sim Value'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ color: theme.palette.text.secondary }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y" style={{ borderColor: theme.palette.divider }}>
          {watchlist.map((ticker) => {
            const { ch, pct, price } = perf(ticker);
            const qty   = localQuantities[ticker] ?? 0;
            const value = qty * price;
            const hasData = price > 0;

            return (
              <tr key={ticker}>
                <td className="px-4 py-4 whitespace-nowrap" style={{ color: theme.palette.text.primary }}>
                  {ticker}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {hasData ? `$${price.toFixed(2)}` : 'N/A'}
                </td>

                <td
                  className="px-4 py-4 whitespace-nowrap"
                  style={{
                    color: pct >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  }}
                >
                  {hasData ? `${pct.toFixed(2)}% (${ch >= 0 ? '+' : ''}${ch.toFixed(2)})` : 'N/A'}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    value={qty}
                    onChange={(e) => handleQuantityChange(ticker, e.target.value)}
                    className="w-20 p-1 rounded border"
                    style={{
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      borderColor: theme.palette.divider,
                      textAlign: 'right',
                    }}
                  />
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {hasData ? (
                    `$${new Intl.NumberFormat('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(value)}`
                  ) : (
                    'N/A'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WatchlistTable;
