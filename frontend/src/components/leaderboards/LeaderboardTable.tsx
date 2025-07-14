import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material";
import { leaderboardsStock } from "@/utils/dataProcessing";


interface LeaderBoardsTableProps {
  data: leaderboardsStock[];
}

export default function LeaderBoardsTable({ data }: LeaderBoardsTableProps) {
  const theme = useTheme();

  const formatPriceChange = (change: number, percentage: number) => {
    const isPositive = change >= 0;
    const color = isPositive ? "green" : "red";
    const sign = isPositive ? "+" : "";
    return (
      <span style={{ color }}>
        {`${sign}${change.toFixed(2)}(${sign}${percentage.toFixed(2)}%)`}
      </span>
    );
  };

  const formatEarnings = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const month = date.toLocaleString("default", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const formatValue = (value: number, gainLoss: number) => {
    const isPositive = gainLoss >= 0;
    const color = isPositive ? "green" : "red";
    const sign = isPositive ? "+" : "";
    
    return (
      <span>
        <span style={{ color }}>
          {`${sign}${gainLoss.toFixed(2)}$`}
        </span>
        {` (${value.toFixed(2)}$)`}
      </span>
    );
  };
  

  return (
    <TableContainer component={Paper} sx={{
      marginTop:'6em'
    }}>
      <Table sx={{ minWidth: 650,}} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Company</TableCell>
            <TableCell align="right">Price Change</TableCell>
            <TableCell align="right">Share Price</TableCell>
            <TableCell align="right">Position Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
              <span
                    style={{
                      color: theme.palette.text.primary,
                      fontWeight: "700",
                      fontSize: "1.1em",
                    }}
                  >
                    {row.ticker}
                  </span>
              </TableCell>
              <TableCell align="right">{formatPriceChange(row.priceChange, row.priceChangePercentage)}</TableCell>
              <TableCell align="right">{row.sharePrice.toFixed(2)}$</TableCell>
              <TableCell align="right">{formatValue(row.value, row.gainLoss)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
