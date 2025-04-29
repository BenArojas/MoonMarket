import { deleteTransaction, getUserTransactions } from "@/api/transaction";
import { getUserStocks } from "@/api/user";
import {
  TradingActivityDistribution,
  TransactionsByQuarter,
} from "@/components/TransactionsGraphs";
import TransactionsTable from "@/components/TransactionsTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction, useTransactionSummary } from "@/hooks/useTransactionSummary";
import SkeletonTable from "@/Skeletons/TableSkeleton";
import "@/styles/App.css";
import { formatCurrency } from '@/utils/dataProcessing';
import {
  MenuItem,
  TextField,
  useTheme
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpCircle,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { useState } from "react";

// Main component
const TransactionsPage = () => {
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: getUserTransactions
  });

  const {
    data: stocks = [],
    isLoading: stocksLoading,
    error: stocksError
  } = useQuery({
    queryKey: ['userStocks'],
    queryFn: getUserStocks
  });

  const summaryData = useTransactionSummary({
    transactions,
    stocks,
  });

  // Show loading state
  if (transactionsLoading || stocksLoading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <SkeletonTable />
        </div>
      </div>
    );
  }

  // Show error state
  if (transactionsError || stocksError) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col">
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="text-center py-6 text-red-500">
              Error loading data. Please try again later.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-4 mb-4 mx-0 h-auto max-sm:w-[430px] sm:h-[calc(100vh-10rem)] sm:w-full">
      <div className="flex-1 overflow-y-auto p-4 lg:space-y-6 custom-scrollbar ">
        <SummaryCards summaryData={summaryData} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-2 gap-y-4">

          <TransactionsByQuarter transactions={transactions} />
          <TradingActivityDistribution transactions={transactions} />
        </div>
        <TransactionsContent transactions={transactions} />
      </div>
    </div>
  );
};

export interface TransactionSummary {
  totalTrades: number
  closedTrades: number
  moneySpent: number
  winRate: number
  totalProfit: number
};
// Separate component for summary cards
interface SummaryCardsProps {
  summaryData: TransactionSummary
}
const SummaryCards = ({ summaryData }: SummaryCardsProps) => {
  const theme = useTheme();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
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
          <TrendingUp className="h-4 w-4" color={theme.palette.primary.main} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryData.closedTrades}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Money Spent</div>
          <DollarSign className="h-4 w-4" color={theme.palette.primary.main} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summaryData.moneySpent)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Win Rate</div>
          <ArrowUpCircle className="h-4 w-4" color={theme.palette.primary.main} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryData.winRate}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Total Profit/Loss</div>
          <TrendingUp className="h-4 w-4" color={theme.palette.primary.main} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${summaryData.totalProfit}</div>
        </CardContent>
      </Card>
    </div>
  );
};


interface TransactionFiltersProps {
  activeTab: string;
  filters: Record<string, string>;
  onTabChange: (value: string) => void; // Updated to accept a string parameter
  onFilterChange: (key: string, value: string) => void;
}
// Transaction filters component
const TransactionFilters = ({ activeTab, filters, onTabChange, onFilterChange }: TransactionFiltersProps) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="all">All Trades</TabsTrigger>
        <TabsTrigger value="purchases">Purchases</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
      </TabsList>
    </Tabs>
    {/* Highlighted: Adjusted filters layout */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
      <TextField
        size="small"
        label="Filter by Ticker"
        value={filters.ticker}
        onChange={(e) => onFilterChange("ticker", e.target.value)}
      />
      <TextField
        select
        size="small"
        label="Date Range"
        value={filters.dateRange}
        onChange={(e) => onFilterChange("dateRange", e.target.value)}
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

// Transactions content component
interface TransactionsContentProps{
  transactions: Transaction[]
}
const TransactionsContent = ({ transactions }: TransactionsContentProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    ticker: "",
    type: "",
    dateRange: "all",
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFilters((prev) => ({
      ...prev,
      type: value === "all" ? "" : value === "purchases" ? "purchase" : "sale",
    }));
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const queryClient = useQueryClient();
  const deleteTransactionMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  });

  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransactionMutation.mutate(transactionId);
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
          onDeleteTransaction={handleDeleteTransaction}
        />
      </CardContent>
    </Card>
  );
};

export default TransactionsPage;