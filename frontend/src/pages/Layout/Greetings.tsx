import {
  Box,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useStockStore } from "@/stores/stockStore";
import { ArrowDown, ArrowUp } from "lucide-react";
import PortfolioValue from "./AnimatedNumber"; // Using your animated number component
import SearchBar from "@/components/SearchBar";
import { Link } from "react-router-dom";
import { Paths } from "@/constants/paths";
import mainlogo from "/ToTheMoon.png";

// A component to display the main financial stat using your animated component
const FinancialStat = ({ label, value }: { label: string; value: number }) => (
  <Box>
    <PortfolioValue value={value} />
    <Typography
      variant="caption"
      color="text.secondary"
      component="p"
      sx={{ mt: -1 }}
    >
      {label}
    </Typography>
  </Box>
);

function Greetings() {
  const { coreTotals } = useStockStore();
  const { unrealized, dailyRealized, netLiq, marketValue } = coreTotals;
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("md"));

  // Helper functions and component for PLChip, as requested
  const colorFor = (v: number) => (v >= 0 ? "success.main" : "error.main");
  const arrowFor = (v: number) =>
    v >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const PLChip = ({ label, value }: { label: string; value: number }) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2" sx={{ color: colorFor(value) }}>
        {arrowFor(value)}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: colorFor(value), fontWeight: 500 }}
      >
        {label}: {fmt(value)}$
      </Typography>
    </Stack>
  );

  return (
    <Box sx={{ width: "95%", mx: "auto", py: 3, px: 5 }}>
      <Stack
        direction={isMobileScreen ? "column" : "row"}
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link
              draggable={false}
              to={Paths.protected.app.home}
              className="logo"
            >
              <img
                draggable={false}
                src={mainlogo}
                style={{
                  height: isMobileScreen ? "80px" : "100px",
                  width: isMobileScreen ? "50px" : "60px",
                }}
              />
            </Link>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              MoonMarket
            </Typography>
          </Box>
          <Stack direction="column" spacing={0.5}>
            <PLChip label="Unrealized" value={unrealized} />
            <PLChip label="Daily Realized" value={dailyRealized} />
          </Stack>
        </Stack>

        {!isMobileScreen && <SearchBar />}

        <Stack direction="row" spacing={4} alignItems="center">
          <FinancialStat label="Net Liquidation Value" value={netLiq} />
          <FinancialStat label="Market Value" value={marketValue} />
        </Stack>

        {isMobileScreen && <SearchBar />}
      </Stack>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}

export default Greetings;
