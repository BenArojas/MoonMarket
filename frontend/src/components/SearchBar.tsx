import { useState, useEffect, SyntheticEvent } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  InputAdornment,
  Stack,
  useTheme,
} from "@mui/material";
import api from "@/api/axios";
import { Paths } from "@/constants/paths";
import { Search } from "lucide-react";
import { useStockStore } from "@/stores/stockStore";

interface SearchResult {
  conid: number;
  symbol: string | null;
  companyName: string | null;
  secType: string | null;
}

export default function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { conid: conidFromUrl } = useParams<{ conid: string }>();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly SearchResult[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { ticker, quote, conid: conidFromStore } = useStockStore((state) => state.activeStock);

  const isStockPage = location.pathname.startsWith("/app/stock/");
  const currentUrlConid = conidFromUrl ? parseInt(conidFromUrl, 10) : null;
  
  // Display mode is active ONLY if the URL conid matches the store conid.
  const isDisplayMode = isStockPage && !isEditing && currentUrlConid === conidFromStore;

  useEffect(() => {
    if (!isStockPage) {
      setIsEditing(false);
    }
  }, [isStockPage]);

  useEffect(() => {
    if (!inputValue) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      api
        .get<SearchResult[]>(`/market/search`, { params: { query: inputValue } })
        .then((response) => {
          const validOptions = response.data.filter(
            (item) => item.symbol || item.companyName
          );
          setOptions(validOptions);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Search failed:", error);
          setOptions([]);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  const handleSelectionChange = (
    event: SyntheticEvent,
    value: SearchResult | null
  ) => {
    if (value) {
      setIsEditing(false);
      navigate(Paths.protected.app.stock(value.conid.toString()));
      setOpen(false);
      setOptions([]);
      setInputValue("");
    }
  };

  if (isDisplayMode) {
    const isPositive = quote.changeAmount! >= 0;
    const color = isPositive ? "success.main" : "error.main";
    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return (
      <Box
        onClick={() => setIsEditing(true)}
        sx={{
          display: "flex",
          alignItems: "center",
          width: { xs: "100%", sm: 400, md: 500 },
          height: 56,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "28px",
          px: 2,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: theme.palette.action.hover
          }
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            {ticker}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
            {quote.lastPrice?.toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color }}>
            {quote.changeAmount?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
          </Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {formattedDate} · {formattedTime}
        </Typography>
      </Box>
    );
  }

  // Fallback to the search input view if not in display mode
  // This now covers the loading state between stock page navigations
  return (
    <Autocomplete
      id="stock-search-autocomplete"
      sx={{ width: { xs: "100%", sm: 300, md: 400 } }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onBlur={() => {
        if (isStockPage) {
          setIsEditing(false);
        }
      }}
      isOptionEqualToValue={(option, value) => option.conid === value.conid}
      getOptionLabel={(option) => option.symbol || option.companyName || ""}
      options={options}
      loading={loading}
      onChange={handleSelectionChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.conid}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1">
              {option.symbol || "No Symbol"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {option.companyName || "No Company Name"}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {option.secType || ""}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search Ticker or Company..."
          variant="outlined"
          autoFocus={isEditing}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "28px",
            },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} color={theme.palette.text.secondary} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}