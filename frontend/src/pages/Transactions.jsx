import React, { useState, Suspense } from 'react';
import { useLoaderData, Await, defer } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { getUserTransactions } from '@/api/transaction';
import TransactionsTable from '@/components/TransactionsTable';
import SkeletonTable from '@/Skeletons/TableSkeleton';
import { TextField, Box, Paper, IconButton, Collapse, MenuItem } from '@mui/material'
import { useTransactionSummary } from '@/hooks/TransactionSummary';
import { getUserHoldings, getUserStocks } from '@/api/user'


// Loader function - called once when route is loaded
export const loader = async () => {
  return defer({
    transactions: getUserTransactions(),
    stocks: getUserStocks()
  });
};



// Main component
const TransactionsPage = () => {
  const data = useLoaderData();
  
  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={<SkeletonTable/>}>
        <Await resolve={Promise.all([data.transactions,data.stocks])}>
          {([transactions,  stocks]) => (
            <>
              <SummaryCards 
                summaryData={useTransactionSummary({ 
                  transactions, 
                  stocks 
                })} 
              />
              <TransactionsContent 
                transactions={transactions}
                stocks={stocks}
              />
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
};

// Separate component for summary cards
const SummaryCards = ({ summaryData }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">Total Trades</div>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryData.totalTrades}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">Closed Trades</div>
        <TrendingUp className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryData.closedTrades}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">Profitable Trades</div>
        <ArrowUpCircle className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryData.profitableTrades}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">Win Rate</div>
        <ArrowUpCircle className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summaryData.winRate}%</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">Total Profit/Loss</div>
        <TrendingUp className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${summaryData.totalProfit}</div>
      </CardContent>
    </Card>
  </div>
);

// Separate component for filters
const TransactionFilters = ({ activeTab, filters, onTabChange, onFilterChange }) => (
  <div className="flex justify-between items-center">
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="all">All Trades</TabsTrigger>
        <TabsTrigger value="purchases">Purchases</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="flex items-center space-x-4">
      <TextField
        size="small"
        label="Filter by Ticker"
        value={filters.ticker}
        onChange={(e) => onFilterChange('ticker', e.target.value)}
      />
      <TextField
        select
        size="small"
        label="Date Range"
        value={filters.dateRange}
        onChange={(e) => onFilterChange('dateRange', e.target.value)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="all">All Time</MenuItem>
        <MenuItem value="1m">Last Month</MenuItem>
        <MenuItem value="3m">Last 3 Months</MenuItem>
        <MenuItem value="1y">Last Year</MenuItem>
      </TextField>
    </div>
  </div>
);

// Optional: Separate component for the chart
const PerformanceChart = ({ transactions }) => (
  <Card className="p-4">
    <CardHeader>
      <h3 className="text-lg font-semibold">Performance Overview</h3>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={transactions}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#10b981" />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// TransactionsContent component
const TransactionsContent = ({ transactions, stocks }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    ticker: '',
    type: '',
    dateRange: 'all'
  });

  const handleTabChange = (value) => {
    setActiveTab(value);
    setFilters(prev => ({
      ...prev,
      type: value === 'all' ? '' : value === 'purchases' ? 'purchase' : 'sale'
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg font-semibold">Transactions</h3>
          <TransactionFilters
            activeTab={activeTab}
            filters={filters}
            onTabChange={handleTabChange}
            onFilterChange={handleFilterChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        <TransactionsTable
          data={transactions}
          filters={filters}
        />
      </CardContent>
    </Card>
  );
};

export default TransactionsPage;



