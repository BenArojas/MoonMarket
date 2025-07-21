// src/components/SearchBar.tsx
import { useState, useEffect, SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import api from "@/api/axios";
import { Paths } from "@/constants/paths";

interface SearchResult {
  conid: number;
  symbol: string | null;
  companyName: string | null;
  secType: string | null;
}

export default function SearchBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly SearchResult[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inputValue) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      api
        .get<SearchResult[]>(`/market/search`, {
          params: { query: inputValue },
        })
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
      navigate(Paths.protected.app.stock(value.conid.toString()), {
        state: {
          companyName: value.companyName,
          ticker: value.symbol,
        },
      });

      setOpen(false);
      setOptions([]);
      setInputValue("");
    }
  };

  return (
    <Autocomplete
      id="stock-search-autocomplete"
      sx={{ width: 300 }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
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
          label="Search Ticker or Company..."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}