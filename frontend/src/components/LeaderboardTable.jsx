import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

export default function LeaderBoardsTable({ data }) {

  const formatPriceChange = (change, percentage) => {
    const isPositive = change >= 0;
    const color = isPositive ? "green" : "red";
    const sign = isPositive ? "+" : "";
    return (
      <span style={{ color }}>
        {`${sign}${change.toFixed(2)}(${sign}${percentage.toFixed(2)}%)`}
      </span>
    );
  };

  const formatValue = (value, gainLoss) => {
    const gainLossNumber = parseFloat(gainLoss); // Convert gainLoss to a number
    const isPositive = gainLossNumber >= 0;
    const color = isPositive ? "green" : "red";
    const sign = isPositive ? "+" : "";
    
    return (
      <span>
        <span style={{ color }}>
          {`${sign}${gainLossNumber.toFixed(2)}$`}
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
                      color: "white",
                      fontWeight: "700",
                      fontSize: "1.1em",
                    }}
                  >
                    {row.ticker}
                  </span>{" "}
                  <span style={{ color: "#B0B0B0", fontSize: "0.9em" }}>
                    {row.name}
                  </span>
              </TableCell>
              <TableCell align="right">{formatPriceChange(row.priceChange, row.priceChangePercentage)}</TableCell>
              <TableCell align="right">{row.sharePrice}%</TableCell>
              <TableCell align="right">{formatValue(row.value, row.gainLoss)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
