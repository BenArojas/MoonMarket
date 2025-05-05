import { useQuery } from "@tanstack/react-query";
import { getStocksFromPortfolio } from "@/api/stock";
import { StockInfo } from "@/utils/dataProcessing";



// Optionally, type the return value of the hook
type HoldingsDataReturn = {
  holdingsData: StockInfo[];
  holdingsDataLoading: boolean;
  holdingsError: Error | null;
};

function useHoldingsData(): HoldingsDataReturn {
  const { data: holdingsData = [], isPending: holdingsDataLoading, error: holdingsError } = useQuery<
  StockInfo[] 
  >({
    queryKey: ["holdingsData"],
    queryFn: () => getStocksFromPortfolio(),
    staleTime: 5 * 60 * 1000,
  });

  return { holdingsData, holdingsDataLoading, holdingsError };
}

export default useHoldingsData;