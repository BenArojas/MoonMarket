// ── types/allocation.ts ────────────────────────────────────────────────
export interface RawAllocation {
    assetClass: { long: Record<string, number>; short: Record<string, number> };
    sector:     { long: Record<string, number>; short: Record<string, number> };
    group:      { long: Record<string, number>; short: Record<string, number> };
  }
  
  export interface DonutDatum {
    name: string;
    value: number;
    percentageOfPortfolio: number;
  }
  