import '@/styles/searchBar.css';
import SearchIcon from '@mui/icons-material/Search';
import { TextField } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { styled } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-input': {
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
      caretColor: 'inherit',
      transition: 'background-color 5000s ease-in-out 0s',
    },
  },
});

function SearchBar() {
  const location = useLocation();
  const [tickerInput, setTickerInput] = useState(""); // State to store the typed ticker input
  const navigate = useNavigate();

  const handleChange = (event) => {
    setTickerInput(event.target.value); // Update the typed ticker input
  };
  function isValidStockTicker(ticker) {
    // Check if ticker is a string and has length between 1 and 5
    if (
      typeof ticker === "string" &&
      ticker.length >= 2 &&
      ticker.length <= 5
    ) {
      // Check if ticker contains only alphabetic characters
      if (/^[A-Za-z]+$/.test(ticker)) {
        // Convert ticker to uppercase
        ticker = ticker.toUpperCase();
        return true;
      }
    }
    return false;
  }

  const navigateToStockPage = (ticker) => {
    navigate(`/stock/${ticker}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValidStockTicker(tickerInput)) {
      navigateToStockPage(tickerInput);
      
    } else {
      // Handle invalid ticker input
      alert("Please enter a valid ticker");
    }
  };

  useEffect(() => {
    if (location.pathname === '/home') {
      setTickerInput("");
    }
  }, [location.pathname])

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
        </form >
      </div>
    </div>

  )
}

export default SearchBar