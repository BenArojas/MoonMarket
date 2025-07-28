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
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useStockStore } from "@/stores/stockStore";
import {
  useAccountSummary,
  useConfirmOrder,
  usePlaceOrder,
  usePreviewOrder,
} from "@/hooks/useOrderMutations";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// --- Helper Texts for Tooltips ---
const orderTypeHelp = {
  MKT: "A market order executes at the next available market price.",
  LMT: "A limit order executes only at your specified limit price or better.",
  STP: "A stop order triggers a market order when a specified stop price is reached.",
  STOP_LIMIT:
    "Triggers a limit order when a stop price is reached. Requires both a Stop Price and a Limit Price.",
};

const bracketOrderHelp =
  "Automatically places a profit-taking limit order and a protective stop-loss order once your main order executes. If one exit order fills, the other is automatically canceled (OCA).";

interface TradingTarget {
  conid: number;
  name: string;
  type: "STOCK" | "OPTION";
}

interface OrderPanelProps {
  tradingTarget: TradingTarget | null;
  onRevertToStock: () => void;
  disabled?: boolean;
  disabledReason?: string;
}
const OrderPanel: React.FC<OrderPanelProps> = ({
  tradingTarget,
  onRevertToStock,
  disabled = false,
  disabledReason = "",
}) => {
  const conid = tradingTarget?.conid ?? null;

  // --- Component State ---
  const [isExpanded, setIsExpanded] = useState(true);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState("LMT");
  const [tif, setTif] = useState("DAY");
  const [price, setPrice] = useState("");
  const [auxPrice, setAuxPrice] = useState("");

  // --- Bracket Order State ---
  const [isBracketOrder, setIsBracketOrder] = useState(false);
  const [profitTakerPrice, setProfitTakerPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");

  // --- API/Data State ---
  const [previewData, setPreviewData] = useState<any>(null);
  const [orderIdToPlace, setOrderIdToPlace] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);

  const selectedAccountId = useStockStore((state) => state.selectedAccountId);
  const previewMutation = usePreviewOrder(); // Restored for simple orders
  const placeMutation = usePlaceOrder();
  const confirmMutation = useConfirmOrder();
  const { data: accountSummary, isLoading: isSummaryLoading } =
    useAccountSummary(selectedAccountId);

  const resetOrderState = () => {
    setPreviewData(null);
    setOrderIdToPlace(null);
    setReplyId(null);
  };

  useEffect(() => {
    resetOrderState();
    if (!isBracketOrder) {
      setProfitTakerPrice("");
      setStopLossPrice("");
    }
  }, [
    side,
    quantity,
    orderType,
    price,
    auxPrice,
    tif,
    isBracketOrder,
    tradingTarget,
  ]);

  const handleOrderResponse = (response: any) => {
    const data = response.data[0];
    if (data.error) {
      toast.error(`Order Rejected: ${data.error}`);
      resetOrderState();
      return;
    }
    if (data.id) {
      toast.info("Confirmation required. Please review and confirm below.");
      setReplyId(data.id);
      return;
    }
    if (data.order_id) {
      setReplyId(null);
      setOrderIdToPlace(data.order_id);
      toast.success(`Order ${data.order_id} has been submitted!`);
      return;
    }
    toast.error("Received an unknown response from the server.");
    resetOrderState();
  };

  // --- ADDED BACK: handlePreview for simple orders ---
  const handlePreview = () => {
    if (!conid || !selectedAccountId || !quantity) {
      toast.warning(
        "Please ensure an account is selected and all order details are filled out."
      );
      return;
    }
    // Build the single order payload for preview
    const orderPayload: any = { conid, side, quantity, orderType, tif };
    if (orderType === "LMT") orderPayload.price = parseFloat(price);
    if (orderType === "STP") orderPayload.price = parseFloat(price);
    if (orderType === "STOP_LIMIT") {
      orderPayload.price = parseFloat(price);
      orderPayload.auxPrice = parseFloat(auxPrice);
    }

    previewMutation.mutate(
      { accountId: selectedAccountId, order: orderPayload },
      {
        onSuccess: (response) => setPreviewData(response.data),
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.error ||
            error.response?.data?.detail ||
            "Preview failed with an unknown error.";
          setPreviewData({ error: errorMessage });
        },
      }
    );
  };

  const handlePlaceOrder = () => {
    if (!selectedAccountId || !conid) return;

    let orders = [];
    const parentId = `brkt-${uuidv4()}`;
    const oppositeSide = side === "BUY" ? "SELL" : "BUY";
    const parentOrder: any = { conid, side, quantity, orderType, tif };

    if (orderType === "LMT") parentOrder.price = parseFloat(price);
    if (orderType === "STP") parentOrder.price = parseFloat(price);
    if (orderType === "STOP_LIMIT") {
      parentOrder.price = parseFloat(price);
      parentOrder.auxPrice = parseFloat(auxPrice);
    }

    if (isBracketOrder) {
      if (!profitTakerPrice || !stopLossPrice) {
        toast.error(
          "Please fill out both Profit Taker and Stop Loss prices for a bracket order."
        );
        return;
      }
      parentOrder.cOID = parentId;

      const profitTakerOrder = {
        conid,
        parentId,
        side: oppositeSide,
        quantity,
        orderType: "LMT",
        price: parseFloat(profitTakerPrice),
        tif: "GTC",
        isSingleGroup: true,
      };
      const stopLossOrder = {
        conid,
        parentId,
        side: oppositeSide,
        quantity,
        orderType: "STP",
        price: parseFloat(stopLossPrice),
        tif: "GTC",
        isSingleGroup: true,
      };

      orders = [parentOrder, profitTakerOrder, stopLossOrder];
    } else {
      orders = [parentOrder];
    }

    placeMutation.mutate(
      { accountId: selectedAccountId, orders: orders },
      {
        onSuccess: handleOrderResponse,
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.error ||
            error.response?.data?.detail ||
            "Order placement failed.";
          toast.error(`Error: ${errorMessage}`);
        },
      }
    );
  };

  const handleConfirm = (confirmed: boolean) => {
    if (!replyId) return;
    if (!confirmed) {
      toast.warning("Order canceled by user.");
      resetOrderState();
      return;
    }
    confirmMutation.mutate(
      { replyId, confirmed: true },
      {
        onSuccess: handleOrderResponse,
        onError: (error: any) => {
          /* ... */
        },
      }
    );
  };

  const getOrderTotal = () => {
    if (!previewData?.amount?.total) return 0;
    return parseFloat(previewData.amount.total.replace(/,/g, ""));
  };

  const formatIbkrWarning = (rawWarning: string): string => {
    if (!rawWarning) return "";
    return rawWarning.replace(/^\d+\//, "").replace(/<[^>]*>/g, "");
  };

  const cashBalance = accountSummary?.totalcashvalue?.amount ?? 0;
  const orderTotal = getOrderTotal();
  const usesMargin = orderTotal > cashBalance;
  const isLoading = placeMutation.isPending || confirmMutation.isPending;

  if (disabled) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Alert severity="warning">
          <Typography variant="h6" component="p" gutterBottom>
            Trading Disabled
          </Typography>
          {disabledReason}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ display: "flex", flexDirection: "column", maxHeight: "45vh" }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderBottom: isExpanded ? "1px solid" : "none",
          borderColor: "divider",
          flexShrink: 0,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography variant="h6">Place Order</Typography>
        <IconButton size="small">
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>
      <Collapse in={isExpanded} sx={{ overflowY: "auto" }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            Trading
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="p" noWrap title={tradingTarget?.name}>
              {tradingTarget?.name ?? 'No Instrument Selected'}
            </Typography>
            {tradingTarget?.type === 'OPTION' && (
              <Button size="small" variant="outlined" onClick={onRevertToStock} sx={{ ml: 1, flexShrink: 0 }}>
                Trade Stock
              </Button>
            )}
          </Box>
        </Box>
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
            <Typography variant="body2" color="text.secondary">
              Trading Power:{" "}
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                <MenuItem value="STOP_LIMIT">Stop Limit</MenuItem>
              </Select>
            </FormControl>
            <Tooltip
              title={
                orderTypeHelp[orderType as keyof typeof orderTypeHelp] || ""
              }
            >
              <IconButton>
                <HelpOutlineIcon color="action" />
              </IconButton>
            </Tooltip>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Time in Force</InputLabel>
            <Select
              value={tif}
              label="Time in Force"
              onChange={(e) => setTif(e.target.value)}
            >
              <MenuItem value="DAY">Day</MenuItem>
              <MenuItem value="GTC">Good-Til-Canceled</MenuItem>
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
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
              required
            />
          )}
          {orderType === "STP" && (
            <TextField
              label="Stop Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
              required
            />
          )}
          {orderType === "STOP_LIMIT" && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Stop Price"
                type="number"
                value={auxPrice}
                onChange={(e) => setAuxPrice(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Limit Price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
                required
              />
            </Box>
          )}
          <Divider />
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isBracketOrder}
                  onChange={(e) => setIsBracketOrder(e.target.checked)}
                />
              }
              label="Attach Bracket Order"
            />
            <Tooltip title={bracketOrderHelp}>
              <IconButton size="small" sx={{ verticalAlign: "middle" }}>
                <HelpOutlineIcon fontSize="small" color="action" />
              </IconButton>
            </Tooltip>
          </Box>
          <Collapse in={isBracketOrder}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mt: 1,
                p: 2,
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <TextField
                label="Profit Taker (Limit Price)"
                type="number"
                value={profitTakerPrice}
                onChange={(e) => setProfitTakerPrice(e.target.value)}
                fullWidth
                required={isBracketOrder}
              />
              <TextField
                label="Stop Loss (Stop Price)"
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                fullWidth
                required={isBracketOrder}
              />
            </Box>
          </Collapse>

          {!isBracketOrder ? (
            // Flow for Simple Orders: Preview -> Place
            <Button
              variant="contained"
              onClick={handlePreview}
              disabled={isLoading}
            >
              {previewMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                "Preview Order"
              )}
            </Button>
          ) : (
            // Flow for Bracket Orders: Place Directly
            <Button
              variant="contained"
              color="secondary"
              onClick={handlePlaceOrder}
              disabled={isLoading}
            >
              {placeMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                "Place Bracket Order"
              )}
            </Button>
          )}

          {/* --- ADDED BACK: Preview display for simple orders --- */}
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
                    Commission:{" "}
                    <strong>{previewData.amount?.commission}</strong>
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
                      sx={{ mt: 1, whiteSpace: "pre-wrap" }}
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
                </>
              )}
            </Box>
          )}

          {/* --- Confirmation and Final Success UI (works for both flows) --- */}
          {replyId && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please confirm the action to submit your order.
              </Alert>
              <ButtonGroup fullWidth>
                <Button
                  color="success"
                  onClick={() => handleConfirm(true)}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Confirm & Submit"
                  )}
                </Button>
                <Button
                  color="error"
                  onClick={() => handleConfirm(false)}
                  disabled={confirmMutation.isPending}
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
        </Box>
      </Collapse>
    </Paper>
  );
};

export default React.memo(OrderPanel);
