// src/components/OptionsChain.tsx

import api from "@/api/axios";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Skeleton,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import {
  OptionContract,
  OptionsChainData,
  SingleContractResponse,
} from "./StockItem";
import { useEffect, useMemo, useRef } from "react";
import React from "react";

type ContractDataKey = "delta" | "bidSize" | "askSize" | "last" | "ask" | "bid";

const ContractData = ({
  contract,
  type,
}: {
  contract: OptionContract;
  type: "call" | "put";
}) => {
  const isCall = type === "call";

  // 2. Type the gridOrder array with our new key type.
  const gridOrder: ContractDataKey[] = isCall
    ? ["delta", "bidSize", "askSize", "last", "ask", "bid"]
    : ["bid", "ask", "last", "askSize", "bidSize", "delta"];

  // 3. Type the dataMap object to be a Record using our key type.
  const dataMap: Record<ContractDataKey, string> = {
    delta: contract.delta?.toFixed(2) ?? "-",
    bidSize: contract.bidSize?.toLocaleString() ?? "-",
    askSize: contract.askSize?.toLocaleString() ?? "-",
    last: contract.lastPrice?.toFixed(2) ?? "-",
    ask: contract.ask?.toFixed(2) ?? "-",
    bid: contract.bid?.toFixed(2) ?? "-",
  };

  return (
    <Grid
      container
      alignItems="center"
      justifyContent={isCall ? "flex-start" : "flex-end"}
      spacing={2}
    >
      {gridOrder.map((field) => (
        <Grid
          item
          key={field}
          xs
          sx={{ textAlign: isCall ? "left" : "right", minWidth: "50px" }}
        >
          <Typography variant="body2">{dataMap[field]}</Typography>
        </Grid>
      ))}
    </Grid>
  );
};

interface StrikeRowProps {
  strike: number;
  call: OptionContract | undefined;
  put: OptionContract | undefined;
  isLoading: boolean;
  currentPrice: number;
  onClick: () => void;
}

// A new sub-component for rendering a single row in our options table
const StrikeRow = React.forwardRef<HTMLDivElement, StrikeRowProps>(
  ({ strike, call, put, isLoading, currentPrice, onClick }, ref) => {
    const isCallItm = strike < currentPrice;
    const isPutItm = strike > currentPrice;

    // New semi-transparent colors for the row backgrounds
    const itmGreen = "rgba(38, 166, 154, 0.15)"; // A darker, more subtle green

    return (
      <Box
        ref={ref}
        onClick={onClick}
        sx={{
          cursor: "pointer",
          "&:hover": {
            ".call-half, .put-half": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          },
          borderBottom: "1px solid #333",
        }}
      >
        <Grid container alignItems="center" justifyContent="center">
          {/* CALLS Column */}
          <Grid
            item
            xs={5}
            className="call-half"
            sx={{
              p: 1.5,
              // Use the new green for ITM calls
              backgroundColor: isCallItm ? itmGreen : "transparent",
            }}
          >
            {isLoading ? (
              <Skeleton variant="text" width="90%" />
            ) : (
              call && <ContractData contract={call} type="call" />
            )}
          </Grid>

          {/* STRIKE Column */}
          <Grid item xs={2} textAlign="center">
            <Chip
              label={strike.toFixed(2)}
              size="small"
              sx={{
                fontWeight: "bold",
                width: "90px",
                color: "white",
                // Use new, more subtle colors for the Chip
                // Green for ITM calls, Red for OTM calls (and ATM strikes)
                backgroundColor: isCallItm
                  ? "rgba(38, 166, 154, 0.25)"
                  : "rgba(239, 83, 80, 0.25)",
              }}
            />
          </Grid>

          {/* PUTS Column */}
          <Grid
            item
            xs={5}
            className="put-half"
            sx={{
              p: 1.5,
              // CORRECTED: Use the new green for ITM puts
              backgroundColor: isPutItm
                ? "rgba(239, 83, 80, 0.25)"
                : "transparent",
            }}
          >
            {isLoading ? (
              <Skeleton variant="text" width="90%" sx={{ ml: "auto" }} />
            ) : (
              put && <ContractData contract={put} type="put" />
            )}
          </Grid>
        </Grid>
      </Box>
    );
  }
);

interface OptionsChainProps {
  allStrikes: number[];
  ticker: string;
  onChainUpdate: (updatedChain: OptionsChainData) => void;
  chainData: OptionsChainData | null;
  expirations: string[];
  selectedExpiration: string;
  onExpirationChange: (event: SelectChangeEvent<string>) => void;
  isLoading: boolean;
  error: string | null;
  currentPrice: number;
}

export default function OptionsChain({
  allStrikes,
  ticker,
  onChainUpdate,
  chainData,
  expirations,
  selectedExpiration,
  onExpirationChange,
  isLoading,
  error,
  currentPrice,
}: OptionsChainProps) {
  console.log({
    allStrikes,
    chainData,
    expirations,
  });
  const atmStrikeRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const closestStrike = useMemo(
    () =>
      allStrikes.length > 0
        ? allStrikes.reduce((prev, curr) =>
            Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice)
              ? curr
              : prev
          )
        : null,
    [allStrikes, currentPrice]
  );

  useEffect(() => {
    if (scrollContainerRef.current && atmStrikeRef.current) {
      const container = scrollContainerRef.current;
      const target = atmStrikeRef.current;

      // Calculate the position to center the target element
      const targetOffsetTop = target.offsetTop;
      const containerHeight = container.clientHeight;
      const targetHeight = target.clientHeight;

      const scrollTop =
        targetOffsetTop - containerHeight / 2 + targetHeight / 2;

      container.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }, [closestStrike]); // Run only when the closest strike is determined

  const {
    mutate,
    isPending,
    variables: pendingStrike,
  } = useMutation({
    mutationFn: (strike: number) =>
      api
        .get<SingleContractResponse>(`market/options/contract/${ticker}`, {
          params: { expiration_month: selectedExpiration, strike },
        })
        .then((res) => res.data),
    onSuccess: (newData) => {
      const strikeKey = newData.strike.toFixed(2);
      onChainUpdate({ ...(chainData || {}), [strikeKey]: newData.data });
    },
    onError: (err, strike) =>
      console.error(`Failed to fetch strike ${strike}`, err),
  });

  const handleStrikeClick = (strike: number) => {
    // We no longer need to manage a 'selected' state, just fetch if needed
    if (!chainData?.[strike]) {
      mutate(strike);
    }
  };

  const headerCellStyle = { color: "grey.500", fontSize: "0.75rem" };
  const callHeaderOrder = [
    "Delta",
    "Bid Size",
    "Ask Size",
    "Last",
    "Ask",
    "Bid",
  ];
  const putHeaderOrder = [
    "Bid",
    "Ask",
    "Last",
    "Ask Size",
    "Bid Size",
    "Delta",
  ];

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      {/* Expiration Dropdown remains the same */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="expiration-select-label" sx={{ color: "#bdbdbd" }}>
          Expiration Date
        </InputLabel>
        <Select
          labelId="expiration-select-label"
          value={selectedExpiration}
          label="Expiration Date"
          onChange={onExpirationChange}
          disabled={expirations.length === 0}
          sx={{
            color: "white",
            ".MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
            "& .MuiSvgIcon-root": { color: "white" },
          }}
        >
          {expirations.map((date) => (
            <MenuItem key={date} value={date}>
              {date}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading Chain Data...</Typography>
        </Box>
      )}

      {error && !isLoading && <Alert severity="error">{error}</Alert>}

      {!isLoading && !error && allStrikes.length > 0 && (
        <Box>
          {/* Table Header */}
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            sx={{ py: 1, borderBottom: "2px solid #555" }}
          >
            <Grid item xs={5}>
              <Grid container spacing={2} justifyContent="flex-start">
                {callHeaderOrder.map((h) => (
                  <Grid
                    item
                    key={h}
                    xs
                    sx={{ textAlign: "left", minWidth: "50px" }}
                  >
                    <Typography sx={headerCellStyle}>{h}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={2} textAlign="center">
              <Typography sx={headerCellStyle}>Strike</Typography>
            </Grid>
            <Grid item xs={5}>
              <Grid container spacing={2} justifyContent="flex-end">
                {putHeaderOrder.map((h) => (
                  <Grid
                    item
                    key={h}
                    xs
                    sx={{ textAlign: "right", minWidth: "50px" }}
                  >
                    <Typography sx={headerCellStyle}>{h}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>

          <Box
            ref={scrollContainerRef}
            sx={{
              height: "350px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px", // This adds the space between rows
            }}
          >
            {allStrikes.map((strike) => {
              const strikeKey = strike.toFixed(2);
              return (
                // Remove the extra Box wrapper and pass the ref directly
                <StrikeRow
                  key={strike}
                  ref={strike === closestStrike ? atmStrikeRef : null}
                  strike={strike}
                  call={chainData?.[strikeKey]?.call}
                  put={chainData?.[strikeKey]?.put}
                  isLoading={isPending && pendingStrike === strike}
                  currentPrice={currentPrice}
                  onClick={() => handleStrikeClick(strike)}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
