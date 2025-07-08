import { fetchAccountDetails, fetchBalances } from "@/api/user";
import {
  Box,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { AccountDetailsTabContent } from "./profileTabs/AccountTab";
import { BalancesTabContent } from "./profileTabs/BalancesTab";
import { DashboardTabContent } from "./profileTabs/DashboardTab";

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

// const mockDashboardData = {
//   pnl: {
//     dailyPnl: 1845.7,
//     unrealizedPnl: 28607.5,
//     realizedPnl: 1230.0,
//   },
//   liquidity: {
//     netLiquidity: 215721776.0,
//     excessLiquidity: 210000000.0,
//     buyingPower: 431443552.0,
//   },
//   cash: {
//     totalCash: 215100080.0,
//     settledCash: 215100080.0,
//   },
// };

// const mockBalancesData = {
//   baseCurrency: "USD",
//   ledgers: [
//     {
//       currency: "BASE",
//       cashBalance: 215100080.0,
//       settledCash: 215100080.0,
//       unrealizedPnl: 39907.37,
//       dividends: 150.25,
//       exchangeRate: 1,
//     },
//     {
//       currency: "USD",
//       cashBalance: 214716688.0,
//       settledCash: 214716688.0,
//       unrealizedPnl: 39695.82,
//       dividends: 150.25,
//       exchangeRate: 1,
//     },
//     {
//       currency: "EUR",
//       cashBalance: 354681.0,
//       settledCash: 354681.0,
//       unrealizedPnl: 211.55,
//       dividends: 0,
//       exchangeRate: 1.08,
//     },
//     {
//       currency: "CAD",
//       cashBalance: 25000.0,
//       settledCash: 20000.0,
//       unrealizedPnl: 0,
//       dividends: 0,
//       exchangeRate: 0.73,
//     },
//   ],
// };

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


export const ProfileTabs = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
