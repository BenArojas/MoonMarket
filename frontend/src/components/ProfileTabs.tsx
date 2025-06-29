import React, { useState } from 'react';
import { Box, Tabs, Tab, useTheme, useMediaQuery, Typography, Card, CardContent, Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';

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
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// --- Mock Data (Simulating API Responses) ---

const mockDashboardData = {
  pnl: {
    dailyPnl: 1845.70,
    unrealizedPnl: 28607.50,
    realizedPnl: 1230.00,
  },
  liquidity: {
    netLiquidity: 215721776.00,
    excessLiquidity: 210000000.00,
    buyingPower: 431443552.00,
  },
  cash: {
    totalCash: 215100080.00,
    settledCash: 215100080.00,
  }
};

const mockBalancesData = {
  baseCurrency: "USD",
  ledgers: [
    { currency: "BASE", cashBalance: 215100080.00, settledCash: 215100080.00, unrealizedPnl: 39907.37, dividends: 150.25, exchangeRate: 1 },
    { currency: "USD", cashBalance: 214716688.0, settledCash: 214716688.0, unrealizedPnl: 39695.82, dividends: 150.25, exchangeRate: 1 },
    { currency: "EUR", cashBalance: 354681.00, settledCash: 354681.00, unrealizedPnl: 211.55, dividends: 0, exchangeRate: 1.08 },
    { currency: "CAD", cashBalance: 25000.00, settledCash: 20000.00, unrealizedPnl: 0, dividends: 0, exchangeRate: 0.73 },
  ]
};

const mockAccountDetailsData = {
    owner: {
        userName: 'user1234',
        entityName: 'John Smith',
        roleId: 'OWNER'
    },
    account: {
        accountId: 'U1234567',
        accountTitle: 'Primary Margin',
        accountType: 'DEMO',
        tradingType: 'PMRGN',
        baseCurrency: 'USD',
        ibEntity: 'IBLLC-US',
        clearingStatus: 'O',
        isPaper: true,
    },
    permissions: {
        allowFXConv: true,
        allowCrypto: false,
        allowEventTrading: true,
        supportsFractions: true,
    }
};

// --- Reusable Helper Components ---

const StatCard = ({ title, value, isCurrency = true, positiveGood = true, showSign = false }) => {
  const theme = useTheme();
  // A simple formatter, you can enhance this
  const formatValue = (num) => {
      if (typeof num !== 'number') return num;
      return new Intl.NumberFormat('en-US', { 
          style: isCurrency ? 'currency' : 'decimal', 
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
  }
  
  const formattedValue = formatValue(value);

  let valueColor = theme.palette.text.primary;
  if (typeof value === 'number' && value !== 0) {
      if ((value > 0 && positiveGood) || (value < 0 && !positiveGood)) {
          valueColor = theme.palette.success.main;
      } else {
          valueColor = theme.palette.error.main;
      }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <CardContent>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div" sx={{ color: valueColor, fontWeight: 'bold' }}>
          {showSign && value > 0 ? '+' : ''}{formattedValue}
        </Typography>
      </CardContent>
    </Card>
  );
};


// --- Tab Content Components ---

const AccountDetailsTabContent = () => {
    const DetailItem = ({ label, value }) => (
       <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
          <Typography variant="body1" sx={{fontWeight: '500'}}>{String(value)}</Typography>
      </Grid>
    );
    
    return (
        <Box>
             <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Owner Information</Typography>
                    <Grid container spacing={2}>
                        <DetailItem label="Username" value={mockAccountDetailsData.owner.userName} />
                        <DetailItem label="Full Name" value={mockAccountDetailsData.owner.entityName} />
                        <DetailItem label="Role" value={mockAccountDetailsData.owner.roleId} />
                    </Grid>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Account Information</Typography>
                     <Grid container spacing={2}>
                        <DetailItem label="Account ID" value={mockAccountDetailsData.account.accountId} />
                        <DetailItem label="Account Title" value={mockAccountDetailsData.account.accountTitle} />
                        <DetailItem label="Account Type" value={mockAccountDetailsData.account.accountType} />
                        <DetailItem label="Trading Type" value={mockAccountDetailsData.account.tradingType} />
                        <DetailItem label="Base Currency" value={mockAccountDetailsData.account.baseCurrency} />
                        <DetailItem label="IB Entity" value={mockAccountDetailsData.account.ibEntity} />
                        <DetailItem label="Status" value={mockAccountDetailsData.account.clearingStatus === 'O' ? 'Open' : 'Other'} />
                        <DetailItem label="Account Mode" value={mockAccountDetailsData.account.isPaper ? 'Paper Trading' : 'Live'} />
                    </Grid>
                </CardContent>
            </Card>
            
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>Permissions</Typography>
                    <Grid container spacing={2}>
                         <DetailItem label="FX Conversion" value={mockAccountDetailsData.permissions.allowFXConv ? 'Allowed' : 'Not Allowed'} />
                         <DetailItem label="Crypto Trading" value={mockAccountDetailsData.permissions.allowCrypto ? 'Allowed' : 'Not Allowed'} />
                         <DetailItem label="Event Trading" value={mockAccountDetailsData.permissions.allowEventTrading ? 'Allowed' : 'Not Allowed'} />
                         <DetailItem label="Fractional Shares" value={mockAccountDetailsData.permissions.supportsFractions ? 'Allowed' : 'Not Allowed'} />
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

const DashboardTabContent = () => (
  <Box>
    <Grid container spacing={3}>
      <Grid item xs={12}><Typography variant="h6" color="text.secondary">Profit & Loss</Typography></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Daily PnL" value={mockDashboardData.pnl.dailyPnl} showSign /></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Unrealized PnL" value={mockDashboardData.pnl.unrealizedPnl} /></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Realized PnL" value={mockDashboardData.pnl.realizedPnl} /></Grid>

      <Grid item xs={12}><Typography variant="h6" color="text.secondary" sx={{mt: 2}}>Liquidity & Balances</Typography></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Net Liquidity" value={mockDashboardData.liquidity.netLiquidity} /></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Excess Liquidity" value={mockDashboardData.liquidity.excessLiquidity} /></Grid>
      <Grid item xs={12} sm={4}><StatCard title="Buying Power" value={mockDashboardData.liquidity.buyingPower} /></Grid>

      <Grid item xs={12} sm={6}><StatCard title="Total Cash" value={mockDashboardData.cash.totalCash} /></Grid>
      <Grid item xs={12} sm={6}><StatCard title="Settled Cash" value={mockDashboardData.cash.settledCash} /></Grid>
    </Grid>
  </Box>
);

const BalancesTabContent = () => {
    const formatCurrency = (num, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(num);

    return (
        <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Base Currency: {mockBalancesData.baseCurrency}
            </Typography>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="balances table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Currency</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cash Balance</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Settled Cash</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unrealized PnL</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Dividends</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Exchange Rate (to Base)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mockBalancesData.ledgers.map((row) => (
                            <TableRow key={row.currency}>
                                <TableCell component="th" scope="row">{row.currency}</TableCell>
                                <TableCell align="right">{formatCurrency(row.cashBalance, row.currency === 'BASE' ? mockBalancesData.baseCurrency : row.currency)}</TableCell>
                                <TableCell align="right">{formatCurrency(row.settledCash, row.currency === 'BASE' ? mockBalancesData.baseCurrency : row.currency)}</TableCell>
                                <TableCell align="right" sx={{ color: row.unrealizedPnl >= 0 ? 'success.main' : 'error.main' }}>
                                    {formatCurrency(row.unrealizedPnl, row.currency === 'BASE' ? mockBalancesData.baseCurrency : row.currency)}
                                </TableCell>
                                <TableCell align="right">{formatCurrency(row.dividends, row.currency === 'BASE' ? mockBalancesData.baseCurrency : row.currency)}</TableCell>
                                <TableCell align="right">{row.exchangeRate}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// --- Main ProfileTabs Component ---
export const ProfileTabs = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabsConfig = [
    { label: "Account Details", content: <AccountDetailsTabContent /> },
    { label: "Dashboard", content: <DashboardTabContent /> },
    { label: "Balances", content: <BalancesTabContent /> },
  ];

  return (
    <Box
      sx={{
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: isMobileScreen ? 'column' : 'row',
        width: '100%',
        maxWidth: '1400px',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Tabs
        orientation={isMobileScreen ? 'horizontal' : 'vertical'}
        variant={isMobileScreen ? 'scrollable' : 'standard'}
        scrollButtons="auto"
        allowScrollButtonsMobile
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Profile Tabs"
        sx={{
          borderRight: isMobileScreen ? 0 : 1,
          borderBottom: isMobileScreen ? 1 : 0,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
          },
        }}
      >
        {tabsConfig.map((tab, index) => (
          <Tab label={tab.label} key={tab.label} id={`profile-tab-${index}`} />
        ))}
      </Tabs>

      {tabsConfig.map((tab, index) => (
          <TabPanel value={activeTab} index={index} key={index}>
            <Typography variant="h5" component="h1" gutterBottom>{tabsConfig[index].label}</Typography>
            {tab.content}
          </TabPanel>
      ))}
    </Box>
  );
};
