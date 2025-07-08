import {
    useStockStore
} from "@/stores/stockStore";
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    useTheme
} from "@mui/material";

export const DashboardTabContent = () => {
    // Reads LIVE data directly from the Zustand store, updated by WebSockets
    const totals = useStockStore((state) => state.coreTotals);
    const buyingPower = useStockStore(
      (state) =>
        state.pnl[Object.keys(state.pnl).find((k) => k.endsWith(".Core")) ?? ""]
          ?.mv ?? 0
    );
  
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" color="text.secondary">
              Profit & Loss
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard title="Daily PnL" value={totals.dailyRealized} showSign />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard title="Unrealized PnL" value={totals.unrealized} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard title="Net Liquidity" value={totals.netLiq} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
              Buying Power
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard title="Margin Value" value={buyingPower} />
          </Grid>
        </Grid>
      </Box>
    );
  };
  


  const StatCard = ({
    title,
    value,
    isCurrency = true,
    positiveGood = true,
    showSign = false,
  }) => {
    const theme = useTheme();
    // A simple formatter, you can enhance this
    const formatValue = (num: number) => {
      if (typeof num !== "number") return num;
      return new Intl.NumberFormat("en-US", {
        style: isCurrency ? "currency" : "decimal",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };
  
    const formattedValue = formatValue(value);
  
    let valueColor = theme.palette.text.primary;
    if (typeof value === "number" && value !== 0) {
      if ((value > 0 && positiveGood) || (value < 0 && !positiveGood)) {
        valueColor = theme.palette.success.main;
      } else {
        valueColor = theme.palette.error.main;
      }
    }
  
    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography
            variant="h5"
            component="div"
            sx={{ color: valueColor, fontWeight: "bold" }}
          >
            {showSign && value > 0 ? "+" : ""}
            {formattedValue}
          </Typography>
        </CardContent>
      </Card>
    );
  };