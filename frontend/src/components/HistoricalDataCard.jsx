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


export function HistoricalDataCard({ historicalData, selectedTicker }) {
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
                stockTicker={selectedTicker}
              />
            )}
          </Await>
        </Suspense>
      </ErrorBoundary>
    );
  }