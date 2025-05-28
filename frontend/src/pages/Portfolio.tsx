import { getHistoricalData } from "@/api/stock";
import { getUserInsights } from "@/api/user";
import AiDialog from "@/components/AiDialog";
import DataGraph from "@/components/DataGraph";
import { ErrorFallback } from "@/components/ErrorFallBack";
import GraphMenu, { GraphType } from "@/components/GraphMenu";
import { HistoricalDataCard } from '@/components/HistoricalDataCard';
import NewUserNoHoldings from "@/components/NewUserNoHoldings";
import useGraphData from "@/hooks/useGraphData";
import { StockData, useStockStore } from "@/stores/stockStore";
import "@/styles/App.css";
import { Box, Stack, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  useLoaderData
} from "react-router-dom";


type PortfolioLoader = {
  request: Request
}
export async function loader({ request }: PortfolioLoader) {
  const { searchParams } = new URL(request.url);
  const selectedTicker = searchParams.get("selected") || "BTCUSD";

  return {
    historicalData: getHistoricalData(selectedTicker),
  };
}

function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}


function Portfolio() {
  const userData = {};
  const { historicalData } = useLoaderData();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery('(min-width:1550px) and (max-width:1800px)');
  const [openInsights, setOpenInsights] = useState(false);
  const [aiData, setAiData] = useState({ portfolio_insights: "", sentiments: {}, citations: [] });
  const [loadingAI, setLoadingAI] = useState(false);

  const stocks = useStockStore(state => state.stocks);
  const status = useStockStore(state => state.connectionStatus);
  // This selector computes a derived value. It's automatically memoized.
  const totalValue = useStockStore(state => 
    Object.values(state.stocks).reduce((total, stock) => total + stock.value, 0)
  );

  if (status === 'connecting') {
    return <div>Connecting to live data...</div>;
  }


  const fetchInsights = async () => {
    setLoadingAI(true);
    try {
      const response = await getUserInsights();
      const data = response.data;
      setAiData({
        portfolio_insights: data.portfolio_insights || "",
        citations: data.citations || [],
        sentiments: {}
      });
      setOpenInsights(true);
    } catch (error) {
      throw error;
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <Box
      className="custom-scrollbar"
      sx={{
        display: "flex",
        flexDirection: isSmallScreen ? "column" : "row",
        gridTemplateColumns: isSmallScreen ? "1fr" : "1000px auto",
        paddingY: isMobileScreen ? 2 : isSmallScreen ? 2 : 1,
        paddingX: isMobileScreen ? 2 : isSmallScreen ? 2 : 5,
        marginX: isMobileScreen ? 1 : isSmallScreen ? 1 : 5,
        overflowY: "auto",
        height: isSmallScreen && !isMobileScreen ? '83vh' : '100%',
        gap: isMobileScreen ? 2 : isSmallScreen ? 2 : 4,
        alignItems: isMobileScreen ? "center" : "flex-start",
      }}
    >

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <PortfolioContent totalValue={totalValue} stocks={stocks} isMediumScreen={isMediumScreen} isMobileScreen={isMobileScreen} isSmallScreen={isSmallScreen} />
      </ErrorBoundary>

      {openInsights && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <AiDialog aiData={aiData} openInsights={openInsights} setOpenInsights={setOpenInsights} />
        </ErrorBoundary>
      )}

      <Box sx={{
        width: isSmallScreen ? "100%" : isMediumScreen ? 500 : 600,
        ml: isSmallScreen ? 0 : "auto",
      }}>
        <Stack spacing={isSmallScreen ? 4 : 3} direction={isSmallScreen ? "column-reverse" : "column"} sx={{ height: "100%" }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {/* {dailyTimeFrameLoading ? (
              <GraphSkeleton height={380} />
            ) : (
              <StackedCardsWrapper
                dailyTimeFrame={dailyTimeFrame}
                userData={userData}
                fetchInsights={fetchInsights}
                loadingAI={loadingAI}
              />
            )} */}
          </ErrorBoundary>
          <HistoricalDataCard historicalData={historicalData} />
        </Stack>
      </Box>
    </Box>
  );
}

interface PortfolioContentProps {
  stocks: { [symbol: string]: StockData }
  isSmallScreen: boolean
  isMobileScreen: boolean
  isMediumScreen: boolean
  totalValue: number
}
function PortfolioContent({ stocks, isSmallScreen, isMobileScreen, isMediumScreen }: PortfolioContentProps) {
  const [selectedGraph, setSelectedGraph] = useState<GraphType>("Treemap");
  const [isDailyView, setIsDailyView] = useState(false);
  const { visualizationData, isDataProcessed } = useGraphData(
    stocks,
    selectedGraph,
    isDailyView
  );

  if (isEmpty(stocks)) {
    return (<div className="container"><NewUserNoHoldings /></div>)
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: isMobileScreen ? 'unset' : "center",
        width: isSmallScreen ? "100%" : isMediumScreen ? "800px" : "1000px",
        margin: "auto",
      }}
    >
      <GraphMenu
        selectedGraph={selectedGraph}
        setSelectedGraph={setSelectedGraph}
        isMobileScreen={isMobileScreen}
        isDailyView={isDailyView}
        setIsDailyView={setIsDailyView}
      />
      <DataGraph
        isDataProcessed={isDataProcessed}
        selectedGraph={selectedGraph}
        visualizationData={visualizationData}
        width={isMobileScreen ? 300 : isSmallScreen ? 500 : isMediumScreen ? 800 : 1000}
        height={isMobileScreen ? 250 : isSmallScreen ? 500 : isMediumScreen ? 550 : 660}
        isDailyView={isDailyView}
      />
    </Box>
  );
}

// interface StackedCardsWrapperProps {
//   userData: UserData
//   dailyTimeFrame: SnapshotData[]
//   loadingAI: boolean
//   fetchInsights: () => void
// }
// const StackedCardsWrapper = ({ dailyTimeFrame, userData, fetchInsights, loadingAI }: StackedCardsWrapperProps) => {
//   const { percentageChange, setPercentageChange } =
//     useContext(PercentageChange);
//   const { stockTickers, value, moneySpent } = useGraphData(userData, "Treemap");
//   const formattedDate = lastUpdateDate(userData.last_refresh);
//   const incrementalChange = value - moneySpent;

//   useEffect(() => {
//     if (moneySpent !== 0 && setPercentageChange) {
//       const newPercentageChange = (incrementalChange / moneySpent) * 100;
//       setPercentageChange(newPercentageChange);
//     }
//   }, [incrementalChange, moneySpent]);

//   return (
//     <SnapshotChart
//       formattedDate={formattedDate}
//       stockTickers={stockTickers}
//       incrementalChange={incrementalChange}
//       percentageChange={percentageChange}
//       value={value}
//       dailyTimeFrameData={dailyTimeFrame}
//       fetchInsights={fetchInsights}
//       loadingAI={loadingAI}
//     />

//   );
// };

export default Portfolio;
