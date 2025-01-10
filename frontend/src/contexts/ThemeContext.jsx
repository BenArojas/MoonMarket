import React, { createContext, useState, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { darkTheme, lightTheme } from '@/theme';

const ThemeContext = createContext();

export const useThemeHook = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(darkTheme);

  const toggleTheme = () => {
    setCurrentTheme(prevTheme => prevTheme === darkTheme ? lightTheme : darkTheme);
  };

  const forceDarkMode = () => {
    setCurrentTheme(darkTheme);
  };

  const contextValue = useMemo(() => ({
    theme: currentTheme,
    toggleTheme,
    forceDarkMode,
    mode: currentTheme === darkTheme ? 'dark' : 'light'
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={currentTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};