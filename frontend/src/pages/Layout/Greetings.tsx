import {
  Box,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MarketStatus from "@/pages/Layout/MarketStatus";
import Navbar from "@/pages/Layout/Navbar";
import { useStockStore } from "@/stores/stockStore";
import { ArrowDown, ArrowUp } from "lucide-react";
import PortfolioValue from "./AnimatedNumber";
import { formatCurrency } from '@/utils/dataProcessing';


function Greetings() {
  const { coreTotals } = useStockStore();
  const { unrealized, dailyRealized, netLiq, marketValue } = coreTotals;
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const colorFor = (v: number) => (v >= 0 ? "primary" : "error");
  const arrowFor = (v: number) =>
    v >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const PLChip = ({ label, value }: { label: string; value: number }) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography color={colorFor(value)}>{arrowFor(value)}</Typography>
      <Typography
        variant="body2"
        color={colorFor(value)}
        sx={{ fontWeight: 600 }}
      >
        {label}: {fmt(value)}$
      </Typography>
    </Stack>
  );

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Box
      sx={{
        width: "90%",
        marginRight: "auto",
        marginLeft: "auto",
        paddingBottom: "5px",
      }}
    >
      <Box
        sx={{
          display: isMobileScreen ? "flex" : "grid",
          gridTemplateColumns: "auto auto",
          flexDirection: isMobileScreen ? "column" : "row",
          gap: 1,
          paddingBottom: isMobileScreen ? 2 : 0,
        }}
      >
        <Box
          className="Greetings"
          sx={{
            flex: 1,
            width: "100%",
            padding: 2,
            order: isMobileScreen ? -1 : 0,
            maxWidth: isMobileScreen ? "100%" : "auto", // Ensure full width on mobile
          }}
        >
          <Stack direction={"column"} spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant={"h5"}>Net Liquidation Value:</Typography>
              <PortfolioValue value={netLiq} />
            </Stack>

            <Typography variant={"h6"}>{`Market Value: ${formatCurrency(marketValue)}`}</Typography>
            <Stack direction={"row"} spacing={1}>

            <PLChip label="Unrealized" value={unrealized} />
            <PLChip label="Daily Realized" value={dailyRealized} />
            </Stack>
          </Stack>
          <MarketStatus date={formattedDate} />
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center", // Ensure navbar is centered
            width: "100%",
          }}
        >
          <Navbar />
        </Box>
      </Box>
      <Divider />
    </Box>
  );
}

export default Greetings;
