import { useStockStore } from "@/stores/stockStore";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";

export const DashboardTabContent = () => {

  const { dailyRealized, unrealized, netLiq, marketValue, equityWithLoanValue } = useStockStore((state) => state.coreTotals);


  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" color="text.secondary">
            Profit & Loss
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Daily PnL" value={dailyRealized} showSign />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Unrealized PnL" value={unrealized} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Net Liquidity" value={netLiq} />
        </Grid>
        <Grid item xs={12} sm={4}> {/* New card for Market Value */}
          <StatCard title="Market Value" value={marketValue} />
        </Grid>
        {/* <Grid item xs={12}>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Buying Power & Equity
          </Typography>
        </Grid> */}
        <Grid item xs={12} sm={4}>
          <StatCard title="Equity With Loan Value" value={equityWithLoanValue} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            <Box component="span" fontWeight="bold">Explanation:</Box> The portion of your account's equity that can be used as collateral for margin loans, determining your buying power.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

interface StatCardProps{
  title: string
  value: number
  isCurrency?: boolean
  positiveGood?: boolean
  showSign?: boolean
}
const StatCard = ({
  title,
  value,
  isCurrency = true,
  positiveGood = true,
  showSign = false,
}: StatCardProps) => {
  const theme = useTheme();
  const formatValue = (num: number) => {
    if (typeof num !== "number") return num;
    return new Intl.NumberFormat("en-US", {
      style: isCurrency ? "currency" : "decimal",
      currency: "USD", // Assuming USD for now, could be dynamic
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