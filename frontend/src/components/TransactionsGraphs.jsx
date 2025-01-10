import React, { useMemo, useState } from "react";
import {
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, DollarSign, BarChart2 } from "lucide-react";
import { MenuItem, TextField, useTheme } from "@mui/material";


// Trading Activity Distribution Component
const TradingActivityDistribution = ({ transactions }) => {
  const theme = useTheme(); 
   const processActivityData = () => {
    const stockCounts = transactions.reduce((acc, transaction) => {
      // Extract stock symbol from transaction text using regex
      const match = transaction.text.match(/(?:shares of\s)(\w+)/);
      if (match && match[1]) {
        const symbol = match[1];
        acc[symbol] = (acc[symbol] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(stockCounts)
      .map(([symbol, count]) => ({
        symbol,
        trades: count,
      }))
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 8); // Top 8 most traded stocks
  };

  const activityData = processActivityData();

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-lg font-semibold">Most Active Symbols</div>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activityData}>
            <CartesianGrid strokeDasharray="5 2" />
            <XAxis dataKey="symbol" />
            <YAxis />
            <Bar dataKey="trades" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Function to process the data
const processData = (rawData) => {
  return rawData
    .map((item) => ({
      date: new Date(item.transaction_date),
      value: item.price * item.quantity,
      type: item.type,
      text: item.text,
    }))
    .sort((a, b) => a.date - b.date);
};

const TransactionsByQuarter = ({ transactions }) => {
  const theme = useTheme();

  const processedData = useMemo(
    () => processData(transactions),
    [transactions]
  );

  // Get unique years from the data
  const years = useMemo(
    () =>
      [...new Set(processedData.map((item) => item.date.getFullYear()))].sort(),
    [processedData]
  );

  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]); // Default to latest year

  // Filter data for selected year
  const yearData = useMemo(
    () =>
      processedData.filter((item) => item.date.getFullYear() === selectedYear),
    [processedData, selectedYear]
  );

  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return `Q${Math.floor(date.getMonth() / 3) + 1}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTooltip = (value, name, props) => {
    const { date, text, type } = props.payload;
    return (
      <div
        style={{
          backgroundColor: theme.palette.background.paper,
          padding: "10px",
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          boxShadow: theme.shadows[1]
        }}
      >
        <p style={{ margin: "5px 0" }}>
          <strong>Date:</strong> {formatDate(new Date(date))}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Type:</strong> {type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Value:</strong> ${value.toFixed(2)}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Description:</strong> {text}
        </p>
      </div>
    );
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-lg font-semibold">Transactions</div>
        <div className="flex items-center space-x-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <TextField
            select
            value={selectedYear}
            label="Range"
            size="small"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm"
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={yearData}
            margin={{
              top: 20,
              right: 30,
              left: 40,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatXAxis} interval={0} />
            <YAxis
              label={{
                value: "Transaction Value ($)",
                angle: -90,
                position: "insideBottomLeft",
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return formatTooltip(payload[0].value, payload[0].name, {
                    payload: payload[0].payload,
                  });
                }
                return null;
              }}
            />
            <Legend
              payload={[
                { value: "Purchase", type: "rect", color: theme.palette.primary.light },
                { value: "Sale", type: "rect", color: "#8884d8" },
              ]}
            />
            <Bar dataKey="value" name="Transaction Value">
              {yearData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.type === "purchase" ? theme.palette.primary.light : "#8884d8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export { TradingActivityDistribution, TransactionsByQuarter};
