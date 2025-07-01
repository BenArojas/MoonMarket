import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Typography,
  Card,
  CardContent,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  AccountDetailsDTO,
  LedgerDTO,
  useStockStore,
} from "@/stores/stockStore";
import { useQuery } from "@tanstack/react-query";
import { fetchAccountDetails, fetchBalances } from "@/api/user";

// --- TabPanel Component (unchanged) ---
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      style={{ width: "100%" }}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
}

// --- Mock Data (Simulating API Responses) ---

const mockDashboardData = {
  pnl: {
    dailyPnl: 1845.7,
    unrealizedPnl: 28607.5,
    realizedPnl: 1230.0,
  },
  liquidity: {
    netLiquidity: 215721776.0,
    excessLiquidity: 210000000.0,
    buyingPower: 431443552.0,
  },
  cash: {
    totalCash: 215100080.0,
    settledCash: 215100080.0,
  },
};

const mockBalancesData = {
  baseCurrency: "USD",
  ledgers: [
    {
      currency: "BASE",
      cashBalance: 215100080.0,
      settledCash: 215100080.0,
      unrealizedPnl: 39907.37,
      dividends: 150.25,
      exchangeRate: 1,
    },
    {
      currency: "USD",
      cashBalance: 214716688.0,
      settledCash: 214716688.0,
      unrealizedPnl: 39695.82,
      dividends: 150.25,
      exchangeRate: 1,
    },
    {
      currency: "EUR",
      cashBalance: 354681.0,
      settledCash: 354681.0,
      unrealizedPnl: 211.55,
      dividends: 0,
      exchangeRate: 1.08,
    },
    {
      currency: "CAD",
      cashBalance: 25000.0,
      settledCash: 20000.0,
      unrealizedPnl: 0,
      dividends: 0,
      exchangeRate: 0.73,
    },
  ],
};

// const mockAccountDetailsData = {
//   owner: {
//     userName: "user1234",
//     entityName: "John Smith",
//     roleId: "OWNER",
//   },
//   account: {
//     accountId: "U1234567",
//     accountTitle: "Primary Margin",
//     accountType: "DEMO",
//     tradingType: "PMRGN",
//     baseCurrency: "USD",
//     ibEntity: "IBLLC-US",
//     clearingStatus: "O",
//     isPaper: true,
//   },
//   permissions: {
//     allowFXConv: true,
//     allowCrypto: false,
//     allowEventTrading: true,
//     supportsFractions: true,
//   },
// };

// --- Reusable Helper Components ---

const StatCard = ({
  title,
  value,
  isCurrency = true,
  positiveGood = true,
  showSign = false,
}) => {
  const theme = useTheme();
  // A simple formatter, you can enhance this
  const formatValue = (num) => {
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

// --- Tab Content Components ---

const AccountDetailsTabContent = ({
  data,
  isLoading,
  error,
}: {
  data: AccountDetailsDTO | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" p={5}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Alert severity="error">
        Failed to load account details: {error.message}
      </Alert>
    );
  if (!data) return <Typography>No account details available.</Typography>;

  const DetailItem = ({ label, value }) => (
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: "500" }}>
        {String(value)}
      </Typography>
    </Grid>
  );

  return (
    <Box sx={{ 
      maxHeight: '50vh',
      overflow: 'auto',
      pr: 1, // Add some padding for the scrollbar
    }}>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Owner Information
          </Typography>
          <Grid container spacing={2}>
            <DetailItem label="Username" value={data.owner.userName} />
            <DetailItem label="Full Name" value={data.owner.entityName} />
            <DetailItem label="Role" value={data.owner.roleId} />
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <DetailItem label="Account ID" value={data.account.accountId} />
            <DetailItem
              label="Account Title"
              value={data.account.accountTitle}
            />
            <DetailItem label="Account Type" value={data.account.accountType} />
            <DetailItem label="Trading Type" value={data.account.tradingType} />
            <DetailItem
              label="Base Currency"
              value={data.account.baseCurrency}
            />
            <DetailItem label="IB Entity" value={data.account.ibEntity} />
            <DetailItem
              label="Status"
              value={data.account.clearingStatus === "O" ? "Open" : "Other"}
            />
            <DetailItem
              label="Account Mode"
              value={data.account.isPaper ? "Paper Trading" : "Live"}
            />
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Permissions
          </Typography>
          <Grid container spacing={2}>
            <DetailItem
              label="FX Conversion"
              value={data.permissions.allowFXConv ? "Allowed" : "Not Allowed"}
            />
            <DetailItem
              label="Crypto Trading"
              value={data.permissions.allowCrypto ? "Allowed" : "Not Allowed"}
            />
            <DetailItem
              label="Event Trading"
              value={
                data.permissions.allowEventTrading ? "Allowed" : "Not Allowed"
              }
            />
            <DetailItem
              label="Fractional Shares"
              value={
                data.permissions.supportsFractions ? "Allowed" : "Not Allowed"
              }
            />
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

const DashboardTabContent = () => {
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

const BalancesTabContent = ({
  data,
  isLoading,
  error,
}: {
  data: LedgerDTO | undefined;
  isLoading: boolean;
  error: Error | null;
}) => {
  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" p={5}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Alert severity="error">Failed to load balances: {error.message}</Alert>
    );
  if (!data) return <Typography>No balance information available.</Typography>;

  const formatCurrency = (num: number, currency: string) => {
    // Handle the case where currency is "BASE" or invalid
    if (!currency || currency === "BASE") {
      // Fallback to a default currency or just format as number
      return new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(num);
    } catch (error) {
      // If currency code is invalid, fall back to number formatting
      console.warn(`Invalid currency code: ${currency}`);
      return new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Base Currency: {data.baseCurrency}
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="balances table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Currency</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Cash Balance
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Settled Cash
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Unrealized PnL
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Dividends
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Exchange Rate (to Base)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.ledgers.map((row) => (
              <TableRow key={row.currency}>
                <TableCell component="th" scope="row">
                  {row.currency}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.cashBalance,
                    row.currency === "BASE" ? data.baseCurrency : row.currency
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.settledCash,
                    row.currency === "BASE" ? data.baseCurrency : row.currency
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      row.unrealizedPnl >= 0 ? "success.main" : "error.main",
                  }}
                >
                  {formatCurrency(
                    row.unrealizedPnl,
                    row.currency === "BASE" ? data.baseCurrency : row.currency
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.dividends,
                    row.currency === "BASE" ? data.baseCurrency : row.currency
                  )}
                </TableCell>
                <TableCell align="right">{row.exchangeRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// --- Main ProfileTabs Component ---
export const ProfileTabs = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const { setAccountDetails, setBalances } = useStockStore();
  // const primaryAccountId = useStockStore(
  //   (state) =>
  //     Object.keys(state.pnl)
  //       .find((k) => k.endsWith(".Core"))
  //       ?.split(".")[0]
  // );

  // --- Data Fetching with useQuery ---
  const {
    data: accountDetailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ["accountDetails"],
    queryFn: () => fetchAccountDetails(),
    // enabled: !!primaryAccountId,
    staleTime: Infinity, // This data is static, so it never becomes stale
  });

  const {
    data: balancesData,
    isLoading: isBalancesLoading,
    error: balancesError,
  } = useQuery({
    queryKey: ["balances"],
    queryFn: () => fetchBalances(),
    // enabled: !!primaryAccountId,
    refetchOnWindowFocus: false, // Optional: prevent refetching on window focus
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  useEffect(() => {
    if (accountDetailsData) {
      setAccountDetails(accountDetailsData);
    }
  }, [accountDetailsData, setAccountDetails]); // 👈 Re-run when data or setter changes

  // --- Side effect for syncing balances to Zustand ---
  useEffect(() => {
    if (balancesData) {
      setBalances(balancesData);
    }
  }, [balancesData, setBalances]); // 👈 Re-run when data or setter changes

  const tabsConfig = [
    { label: "Dashboard", content: <DashboardTabContent /> },
    {
      label: "Balances",
      content: (
        <BalancesTabContent
          data={balancesData}
          isLoading={isBalancesLoading}
          error={balancesError}
        />
      ),
    },
    {
      label: "Account Details",
      content: (
        <AccountDetailsTabContent
          data={accountDetailsData}
          isLoading={isDetailsLoading}
          error={detailsError}
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        display: "flex",
        flexDirection: isMobileScreen ? "column" : "row",
        width: "100%",
        maxWidth: "1400px",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Tabs
        orientation={isMobileScreen ? "horizontal" : "vertical"}
        variant={isMobileScreen ? "scrollable" : "standard"}
        scrollButtons="auto"
        allowScrollButtonsMobile
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Profile Tabs"
        sx={{
          borderRight: isMobileScreen ? 0 : 1,
          borderBottom: isMobileScreen ? 1 : 0,
          borderColor: "divider",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "1rem",
          },
        }}
      >
        {tabsConfig.map((tab, index) => (
          <Tab label={tab.label} key={tab.label} id={`profile-tab-${index}`} />
        ))}
      </Tabs>

      {tabsConfig.map((tab, index) => (
        <TabPanel value={activeTab} index={index} key={index}>
          <Typography variant="h5" component="h1" gutterBottom>
            {tabsConfig[index].label}
          </Typography>
          {tab.content}
        </TabPanel>
      ))}
    </Box>
  );
};
