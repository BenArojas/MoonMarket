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
import {  useStockStore } from "@/stores/stockStore";

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


export const ProfileTabs = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const {
    data: accountDetailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ["accountDetails", selectedAccountId],
    queryFn: () => fetchAccountDetails(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  console.log(accountDetailsData)


  const {
    data: balancesData,
    isLoading: isBalancesLoading,
    error: balancesError,
  } = useQuery({ 
    queryKey: ["balances", selectedAccountId], 
    queryFn: () => fetchBalances(selectedAccountId),
    enabled: !!selectedAccountId, 
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
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
