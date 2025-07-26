import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Collapse,
} from "@mui/material";
import { useStockStore } from "@/stores/stockStore";
import {
  useAccountSummary,
  useConfirmOrder,
  usePlaceOrder,
  usePreviewOrder,
} from "@/hooks/useOrderMutations";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface OrderPanelProps {
  conid: number | null;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ conid }) => {

  const [isExpanded, setIsExpanded] = useState(true);

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState("LMT");
  const [limitPrice, setLimitPrice] = useState("");

  const [previewData, setPreviewData] = useState<any>(null);
  const [orderIdToPlace, setOrderIdToPlace] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);

  const selectedAccountId = useStockStore((state) => state.selectedAccountId);
  const previewMutation = usePreviewOrder();
  const placeMutation = usePlaceOrder();
  const confirmMutation = useConfirmOrder();
  const { data: accountSummary, isLoading: isSummaryLoading } =
    useAccountSummary(selectedAccountId);

  // Clear preview when order details change
  useEffect(() => {
    setPreviewData(null);
    setOrderIdToPlace(null);
    setReplyId(null);
  }, [side, quantity, orderType, limitPrice]);

  const handlePreview = () => {
    if (!conid || !selectedAccountId || !quantity) {
      alert(
        "Please ensure an account is selected and all order details are filled out."
      );
      return;
    }

    previewMutation.mutate(
      {
        accountId: selectedAccountId,
        order: {
          conid,
          side,
          quantity,
          orderType,
          price: orderType === "LMT" ? parseFloat(limitPrice) : undefined,
          tif: "DAY",
        },
      },
      {
        onSuccess: (response) => {
          setPreviewData(response.data);
        },
        onError: (error) => {
          console.error("Preview failed:", error);

          let errorMessage = "An unknown error occurred during preview.";
          const errorData = error.response?.data as any;

          // Check for FastAPI's detailed validation error format
          if (
            errorData?.detail &&
            Array.isArray(errorData.detail) &&
            errorData.detail[0]?.msg
          ) {
            const firstError = errorData.detail[0];
            errorMessage = `Invalid Input: ${firstError.msg} for the '${firstError.loc[1]}' field.`;

            // Check for a simple string detail
          } else if (typeof errorData?.detail === "string") {
            errorMessage = errorData.detail;
          }

          // Set the simple string as the error state
          setPreviewData({ error: errorMessage });
        },
      }
    );
  };

  const handlePlaceOrder = () => {
    if (!conid || !selectedAccountId || !quantity) {
      alert(
        "Please ensure an account is selected and all order details are filled out."
      );
      return;
    }
    if (!previewData || previewData.error || !selectedAccountId) return;

    placeMutation.mutate(
      {
        accountId: selectedAccountId,
        order: {
          conid,
          side,
          quantity,
          orderType,
          price: orderType === "LMT" ? parseFloat(limitPrice) : undefined,
          tif: "DAY",
        },
      },
      {
        onSuccess: (response) => {
          // Check for confirmation message
          if (response.data[0].id) {
            setReplyId(response.data[0].id);
            alert(
              `Confirmation required: ${response.data[0].message.join("\n")}`
            );
          } else {
            setOrderIdToPlace(response.data[0].order_id);
            alert(`Order ${response.data[0].order_id} submitted successfully!`);
          }
        },
        onError: (error) => {
          alert(
            `Order placement failed: ${
              error.response?.data?.detail || "Unknown error"
            }`
          );
        },
      }
    );
  };

  const handleConfirm = (confirmed: boolean) => {
    if (!replyId) return;
    confirmMutation.mutate(
      { replyId, confirmed },
      {
        onSuccess: (response) => {
          setOrderIdToPlace(response.data[0].order_id);
          alert(`Order ${response.data[0].order_id} confirmed and submitted!`);
          setReplyId(null);
        },
        onError: (error) => {
          alert(
            `Confirmation failed: ${
              error.response?.data?.detail || "Unknown error"
            }`
          );
        },
      }
    );
  };

  const getOrderTotal = () => {
    if (!previewData?.amount?.total) return 0;
    // Example: "176.23 USD" -> 176.23
    return parseFloat(previewData.amount.total.split(" ")[0].replace(",", ""));
  };

  const formatIbkrWarning = (rawWarning: string): string => {
    if (!rawWarning) return "";
    return rawWarning.replace(/^\d+\//, "").replace(/<[^>]*>/g, "");
  };

  const cashBalance = accountSummary?.totalcashvalue?.amount ?? 0;
  const orderTotal = getOrderTotal();
  const usesMargin = orderTotal > cashBalance;

  const isLoading =
    previewMutation.isPending ||
    placeMutation.isPending ||
    confirmMutation.isPending;

  return (
    <Paper
      variant="outlined"
      sx={{
        // ✅ 1. Make the Paper a flex container
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '55vh',
    }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid' : 'none',
          borderColor: 'divider',
          // This prevents the header from shrinking
          flexShrink: 0,
      }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography variant="h6">
          Place Order
        </Typography>
        <IconButton size="small">
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>
      <Collapse in={isExpanded}  sx={{ overflowY: 'auto' }}>
      {accountSummary && (
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* This part displays your ACTUAL cash using totalcashvalue */}
          <Typography variant="body2">
            Settled Cash:{" "}
            {isSummaryLoading ? (
              <CircularProgress size={14} />
            ) : (
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: accountSummary?.totalcashvalue?.currency || "USD",
                }).format(accountSummary?.totalcashvalue?.amount || 0)}
              </strong>
            )}
          </Typography>

          {/* This part displays your TRADING POWER using availablefunds */}
          <Typography variant="body2" color="text.secondary">
            Trading Power (with Margin):{" "}
            {isSummaryLoading ? (
              <CircularProgress size={14} />
            ) : (
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: accountSummary?.availablefunds?.currency || "USD",
                }).format(accountSummary?.availablefunds?.amount || 0)}
              </strong>
            )}
          </Typography>
        </Box>
      )}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <ButtonGroup fullWidth>
          <Button
            variant={side === "BUY" ? "contained" : "outlined"}
            color="success"
            onClick={() => setSide("BUY")}
          >
            Buy
          </Button>
          <Button
            variant={side === "SELL" ? "contained" : "outlined"}
            color="error"
            onClick={() => setSide("SELL")}
          >
            Sell
          </Button>
        </ButtonGroup>

        <FormControl fullWidth>
          <InputLabel>Order Type</InputLabel>
          <Select
            value={orderType}
            label="Order Type"
            onChange={(e) => setOrderType(e.target.value)}
          >
            <MenuItem value="MKT">Market</MenuItem>
            <MenuItem value="LMT">Limit</MenuItem>
            <MenuItem value="STP">Stop</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, parseInt(e.target.value) || 1))
          }
          fullWidth
        />

        {orderType === "LMT" && (
          <TextField
            label="Limit Price"
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            fullWidth
          />
        )}

        <Button
          variant="contained"
          onClick={handlePreview}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : "Preview Order"}
        </Button>
        {previewData && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Order Preview
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {previewData.error ? (
              <Alert severity="error">{previewData.error}</Alert>
            ) : (
              <>
                <Typography variant="body2">
                  Total Cost: <strong>{previewData.amount?.total}</strong>
                </Typography>
                <Typography variant="body2">
                  Commission: <strong>{previewData.amount?.commission}</strong>
                </Typography>
                <Typography variant="body2">
                  Equity After: <strong>{previewData.equity?.after}</strong>
                </Typography>
                {usesMargin && cashBalance > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    This order will use margin.
                  </Alert>
                )}
                {previewData.warn && (
                  <Alert
                    severity="warning"
                    sx={{
                      mt: 1,
                      whiteSpace: "pre-wrap", 
                    }}
                  >
                    {formatIbkrWarning(previewData.warn)}
                  </Alert>
                )}

                {!orderIdToPlace && !replyId && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {placeMutation.isPending ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Place Order"
                    )}
                  </Button>
                )}

                {replyId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography color="error.main" gutterBottom>
                      Confirmation Needed
                    </Typography>
                    <ButtonGroup fullWidth>
                      <Button
                        color="success"
                        onClick={() => handleConfirm(true)}
                        disabled={confirmMutation.isPending}
                      >
                        Confirm & Submit
                      </Button>
                      <Button
                        color="error"
                        onClick={() => handleConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </ButtonGroup>
                  </Box>
                )}

                {orderIdToPlace && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Order Submitted! ID: {orderIdToPlace}
                  </Alert>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
      </Collapse>
    </Paper>
  );
};

export default React.memo(OrderPanel);
