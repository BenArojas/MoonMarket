import {
    LedgerDTO,
    useStockStore
} from "@/stores/stockStore";
import {
    Alert,
    Box,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import { useEffect } from "react";


export const BalancesTabContent = ({
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

    const { setBalances } = useStockStore();

    useEffect(() => {
        if (data) {
          setBalances(data);
        }
      }, [data]); 
  
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