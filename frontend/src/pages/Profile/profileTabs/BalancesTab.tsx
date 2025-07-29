import { LedgerDTO } from "@/api/user";
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
  if (!data || !data.ledgers || data.ledgers.length === 0) 
    return <Typography>No balance information available.</Typography>;


  const formatCurrency = (num: number, currency: string) => {
    if (!currency || currency === "BASE") {
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
      console.warn(`Invalid currency code for formatting: ${currency}`);
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
              <TableRow key={row.secondkey}> {/* Use snake_case: row.secondkey */}
                <TableCell component="th" scope="row">
                  {row.secondkey} {/* Use snake_case: row.secondkey */}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.cashbalance, // Use snake_case: row.cashbalance
                    row.secondkey === "BASE" ? data.baseCurrency : row.secondkey // Use snake_case: row.secondkey
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.settledcash, // Use snake_case: row.settledcash
                    row.secondkey === "BASE" ? data.baseCurrency : row.secondkey
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      row.unrealizedpnl >= 0 ? "success.main" : "error.main", // Use snake_case: row.unrealizedpnl
                  }}
                >
                  {formatCurrency(
                    row.unrealizedpnl, // Use snake_case: row.unrealizedpnl
                    row.secondkey === "BASE" ? data.baseCurrency : row.secondkey
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    row.dividends,
                    row.secondkey === "BASE" ? data.baseCurrency : row.secondkey
                  )}
                </TableCell>
                <TableCell align="right">{row.exchangerate}</TableCell> {/* Use snake_case: row.exchangerate */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};