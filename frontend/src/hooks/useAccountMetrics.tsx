// src/hooks/useAccountMetrics.ts ------------------------------------------------
import { useMemo } from 'react';
import { useStockStore } from '@/stores/stockStore';

type Totals = { netLiq: number; unrealised: number };

/**
 * useAccountMetrics
 * -----------------
 * Returns:
 *  • netLiqBase      – Net-Liquidation of the BASE currency row
 *  • unrealisedBase  – Unrealised P/L of the BASE currency row
 *  • totals          – Net-Liquidation & Unrealised P/L summed across *all* currencies
 *  • ledger          – The raw LedgerDTO in case the caller needs more fields
 */
export function useAccountMetrics() {
  // Grab the live ledger object from Zustand (updates every ~10 s via sld+ WS)
  const ledger = useStockStore(state => state.ledger);

  /* ---------- 1.  BASE currency row --------------------------------------- */
  const baseRow = useMemo(() => {
    return ledger?.currencies.find(c => c.currency === 'BASE');
  }, [ledger]);

  const netLiqBase      = baseRow?.netLiquidationValue ?? 0;
  const unrealisedBase  = baseRow?.unrealizedPnl        ?? 0;

  /* ---------- 2.  Totals across all currencies ---------------------------- */
  const totals: Totals = useMemo(() => {
    if (!ledger) return { netLiq: 0, unrealised: 0 };

    return ledger.currencies.reduce<Totals>(
      (acc, cur) => ({
        netLiq:     acc.netLiq     + cur.netLiquidationValue,
        unrealised: acc.unrealised + cur.unrealizedPnl,
      }),
      { netLiq: 0, unrealised: 0 },
    );
  }, [ledger]);

  /* ---------- 3.  API ------------------------------------------------------ */
  return { netLiqBase, unrealisedBase, totals, ledger };
}
