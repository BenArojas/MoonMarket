import '@/styles/searchBar.css';
import SearchIcon from '@mui/icons-material/Search';
import { TextField } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-input': {
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
      caretColor: 'inherit',
      transition: 'background-color 5000s ease-in-out 0s',
    },
  },
});

const SearchBar: React.FC = () => {
  const location = useLocation();
  const [tickerInput, setTickerInput] = useState<string>("");
  const navigate = useNavigate();

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTickerInput(event.target.value);
  };

  const isValidStockTicker = (ticker: string): boolean => {
    if (
      typeof ticker === "string" &&
      ticker.length >= 2 &&
      ticker.length <= 5
    ) {
      if (/^[A-Za-z]+$/.test(ticker)) {
        return true;
      }
    }
    return false;
  };

  const navigateToStockPage = (ticker: string): void => {
    navigate(`/stock/${ticker}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isValidStockTicker(tickerInput)) {
      navigateToStockPage(tickerInput.toUpperCase());
    } else {
      alert("Please enter a valid ticker");
    }
  };

  useEffect(() => {
    if (location.pathname === '/home') {
      setTickerInput("");
    }
  }, [location.pathname]);

  return (
    <div className="search-bar">
      <div className="search-container">
        <form onSubmit={handleSubmit}>
          <StyledTextField
            type="text"
            name="ticker"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={tickerInput}
            onChange={handleChange}
            placeholder="Ticker"
          />
          <input type="submit" hidden />
        </form>
      </div>
    </div>
  );
};

export default SearchBar;