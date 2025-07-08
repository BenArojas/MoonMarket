/*  src/pages/TransactionsPage.tsx */

import { IbkrTrade, getIbkrRecentTrades } from "@/api/transaction";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ---------- SHAPES ---------- */
interface ProcessedTrade {
  id: string;
  date: Date;
  symbol: string;
  description: string;
  side: "Buy" | "Sell";
  quantity: number;
  price: number;
  netAmount: number;
  commission: number;
  conid: number;
}

/* ---------- HELPERS ---------- */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n
  );
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/* ---------- DATA HOOK ---------- */
const useRecentTrades = (days = 7) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ibkrRecentTrades", days],
    queryFn: () => getIbkrRecentTrades(days),
  });

  const trades = useMemo<ProcessedTrade[]>(() => {
    if (!data) return [];
    return (data as IbkrTrade[]).map((t) => ({
      id: t.execution_id,
      date: new Date(t.trade_time_r), // ✅ fixed
      symbol: t.symbol.toUpperCase(),
      description: t.order_description,
      side: t.side === "B" ? "Buy" : "Sell", // ✅ fixed mapping
      quantity: t.size,
      price: +t.price,
      netAmount: t.net_amount,
      commission: +t.commission,
      conid: t.conid,
    }));
  }, [data]);

  const summary = useMemo(() => {
    return trades.reduce(
      (acc, t) => {
        acc.totalTrades += 1;
        acc.totalVolume += Math.abs(t.netAmount);
        acc.totalCommissions += t.commission;
        acc.netCash += t.netAmount - t.commission;
        return acc;
      },
      { totalTrades: 0, totalVolume: 0, totalCommissions: 0, netCash: 0 }
    );
  }, [trades]);

  return { trades, summary, isLoading, error };
};

/* ---------- SUMMARY CARDS ---------- */
const SummaryCards: React.FC<{
  s: ReturnType<typeof useRecentTrades>["summary"];
}> = ({ s }) => {
  const cashColor = s.netCash >= 0 ? "text-green-500" : "text-red-500";
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Net&nbsp;Cash&nbsp;Flow</CardTitle>
          {/* <TrendingUp className="absolute right-6 top-6 h-4 w-4 text-gray-400" /> / */}
        </CardHeader>
        <CardContent>
          <CardDescription className={cashColor}>
            {fmt(s.netCash)}
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Volume Traded</CardTitle>
          {/* <DollarSign className="absolute right-6 top-6 h-4 w-4 text-gray-400" /> */}
        </CardHeader>
        <CardContent>
          <CardDescription>{fmt(s.totalVolume)}</CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Trades</CardTitle>
          {/* <ArrowLeftRight className="absolute right-6 top-6 h-4 w-4 text-gray-400" /> */}
        </CardHeader>
        <CardContent>
          <CardDescription>{s.totalTrades}</CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Commissions</CardTitle>
          {/* <ReceiptText className="absolute right-6 top-6 h-4 w-4 text-gray-400" /> */}
        </CardHeader>
        <CardContent>
          <CardDescription>{fmt(s.totalCommissions)}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

/* ---------- VOLUME PIE ---------- */
const VolumeBySymbolChart: React.FC<{ trades: ProcessedTrade[] }> = ({
  trades,
}) => {
  const data = React.useMemo(() => {
    const vol: Record<string, number> = {};
    trades.forEach((t) => {
      vol[t.symbol] = (vol[t.symbol] || 0) + Math.abs(t.netAmount);
    });
    return Object.entries(vol).map(([name, value]) => ({ name, value }));
  }, [trades]);

  const COLORS = ["#6366f1", "#10b981", "#fbbf24", "#ef4444", "#8b5cf6"];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <h3 className="text-lg font-semibold">Activity by Volume</h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(v as number)} />
            <Legend iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/* ---------- SYMBOL PIE ---------- */
const SymbolActivityChart: React.FC<{ trades: ProcessedTrade[] }> = ({
  trades,
}) => {
  const data = useMemo(
    () =>
      Object.entries(
        trades.reduce<Record<string, number>>(
          (acc, t) => ({ ...acc, [t.symbol]: (acc[t.symbol] || 0) + 1 }),
          {}
        )
      ).map(([name, value]) => ({ name, value })),
    [trades]
  );
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <h3 className="text-lg font-semibold">Activity by Symbol</h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v} trades`} />
            <Legend iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/* ---------- TABLE ---------- */
const TradesTable: React.FC<{ trades: ProcessedTrade[] }> = ({ trades }) => {
  const [tab, setTab] = useState<"all" | "buy" | "sell">("all");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      trades
        .filter(
          (t) =>
            (tab === "all" || t.side.toLowerCase() === tab) &&
            (filter === "" ||
              t.symbol.toLowerCase().includes(filter.toLowerCase()))
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [trades, tab, filter]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-lg font-semibold">Recent Trades</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Filter by symbol…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {/* ✅ proper Radix API */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="buy">Buys</TabsTrigger>
                <TabsTrigger value="sell">Sells</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Net Amt</TableHead>
              <TableHead className="text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{fmtDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.symbol}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full
                    ${
                      t.side === "Buy"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                    >
                      {t.side}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{t.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(t.price)}</TableCell>
                  <TableCell className="text-right">
                    {fmt(t.netAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmt(t.commission)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-gray-500"
                >
                  No trades found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ---------- PAGE ---------- */
const TransactionsPage: React.FC = () => {
  const { trades, summary, isLoading, error } = useRecentTrades(7);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Card className="w-1/2">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-xl font-bold text-red-600 dark:text-red-400">
              Failed to load trades
            </h3>
          </CardHeader>
          <CardContent className="text-center">
            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
              <code>
                {error instanceof Error ? error.message : JSON.stringify(error)}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[80vh] overflow-y-auto">
      <main className="container mx-auto space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-semibold ">Recent Trades</h1>
        <SummaryCards s={summary} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <SymbolActivityChart trades={trades} /> {/* lg:col-span-2 */}
          <VolumeBySymbolChart trades={trades} /> {/* lg:col-span-2 */}
        </div>
        <TradesTable trades={trades} />
      </main>
    </div>
  );
};

export default TransactionsPage;
