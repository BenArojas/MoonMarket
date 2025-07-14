import "@/styles/searchBar.css";
import SearchIcon from "@mui/icons-material/Search";
import { CircularProgress, TextField } from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate, useLocation, useNavigation } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { Paths } from "@/constants/paths";

const StyledTextField = styled(TextField)({
  "& .MuiInputBase-input": {
    "&:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset",
      caretColor: "inherit",
      transition: "background-color 5000s ease-in-out 0s",
    },
  },
});

const isValidStockTicker = (ticker: string): boolean => {
  if (typeof ticker === "string" && ticker.length >= 2 && ticker.length <= 5) {
    if (/^[A-Za-z]+$/.test(ticker)) {
      return true;
    }
  }
  return false;
};

const SearchBar: React.FC = () => {
  const location = useLocation();
  const [tickerInput, setTickerInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { state: navState } = useNavigation();

  // Combine local isLoading with navigation state
  const isBusy = isLoading || navState === "submitting" || navState === "loading";

  const navigateToStockPage = (ticker: string): void => {
    setIsLoading(true); 
    navigate(Paths.protected.app.stock(ticker));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTickerInput(event.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isValidStockTicker(tickerInput)) {
      navigateToStockPage(tickerInput.toUpperCase());
    } else {
      alert("Please enter a valid ticker");
      setIsLoading(false); // Reset loading if ticker is invalid
    }
  };

  // Reset loading state and input when location.pathname changes
  useEffect(() => {
    setIsLoading(false); 
      setTickerInput(""); // Clear input after successful navigation to /stock/:ticker
  }, [location.pathname]);

  return (
    <div className="search-bar">
      <div className="search-container">
        <form onSubmit={handleSubmit}>
          <StyledTextField
            value={tickerInput}
            onChange={handleChange}
            placeholder={isBusy ? "Loading…" : "Ticker"}
            disabled={isBusy}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isBusy ? <CircularProgress size={20} /> : <SearchIcon />}
                </InputAdornment>
              ),
            }}
          />
          <input type="submit" hidden />
        </form>
      </div>
    </div>
  );
};

export default SearchBar;