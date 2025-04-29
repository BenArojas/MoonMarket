import React, { createContext, useState, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { darkTheme, lightTheme } from '@/theme';
import { Theme } from '@mui/material/styles';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  forceDarkMode: () => void;
  mode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeHook = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeHook must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);

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
    mode: currentTheme === darkTheme ? 'dark' : 'light' as const
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue as ThemeContextType}>
      <MuiThemeProvider theme={currentTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};