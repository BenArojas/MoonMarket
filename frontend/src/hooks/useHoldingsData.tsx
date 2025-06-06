import {  useQuery} from "@tanstack/react-query";
import { getStocksFromPortfolio } from "@/api/stock";
import { HoldingData } from "@/contexts/UserContext";



function useHoldingsData(holdingsList: HoldingData[]) {
  const tickers = holdingsList.map((holding) => holding.ticker);

  const { data: holdingsData = [], isPending: holdingsDataLoading, error } = useQuery({
    queryKey: ["holdingsData", tickers],
    queryFn: () => getStocksFromPortfolio(tickers),
    staleTime: 0,
  });

  return { holdingsData, holdingsDataLoading, error };
}

export default useHoldingsData;
