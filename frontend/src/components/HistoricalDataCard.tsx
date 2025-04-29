import CurrentStockCard from "@/components/CurrentStock";
import GraphSkeleton from "@/Skeletons/GraphSkeleton";
import "@/styles/App.css";
import { Box } from "@mui/material";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
    Await
} from "react-router-dom";
import {ErrorFallback} from '@/components/ErrorFallBack'

export interface HistoricalData{
  adjClose: number;
  change: number;
  changeOverTime: number;
  changePercent: number;
  close: number;
  date: string;
  high: number;
  label: string;
  low: number;
  open: number;
  unadjustedVolume: number;
  volume: number;
  vwap: number;
}
interface HistoricalDataObject{
  historical: HistoricalData[]
  symbol: string
}
interface HistoricalDataCardProps{
  historicalData: HistoricalDataObject
}
export function HistoricalDataCard({ historicalData }: HistoricalDataCardProps) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense 
          fallback={
            <Box sx={{ height: 350 }}>
              <GraphSkeleton />
            </Box>
          }
        >
          <Await resolve={historicalData}>
            {(resolvedData) => (
              <CurrentStockCard
                stockData={resolvedData.historical}
                stockTicker={resolvedData.symbol}
              />
            )}
          </Await>
        </Suspense>
      </ErrorBoundary>
    );
  }