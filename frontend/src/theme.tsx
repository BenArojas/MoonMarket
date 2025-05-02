import { createTheme, ThemeOptions } from "@mui/material/styles";
import { teal, red } from '@mui/material/colors';

declare module '@mui/material/styles' {
  interface Palette {
    trinary: Palette['primary'];
  }
  interface PaletteOptions {
    trinary?: PaletteOptions['primary'];
  }
}

const darkThemeOptions: ThemeOptions = {
  shape: {
    borderRadius: 16,
  },
  palette: {
    background: {
      default: "#0b0b0b",
    },
    primary: {
      light: teal[500],
      main: teal[800],
      dark: teal[900],
    },
    secondary: {
      main: "#E1E5EB", // light grey
    },
    trinary: {
      main: "#3f3f46",
    },
    error: {
      main: red[500],
      light: red[200],
      dark: red[800],
    },
    mode: "dark",
  },
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
          src: local('Poppins'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v15/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
          unicodeRange: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF;
        }
      `,
    },
    MuiTextField: {
      defaultProps: {
        autoComplete: 'off',
      },
    },
    MuiInput: {
      defaultProps: {
        autoComplete: 'off',
      },
    },
  },
};

const lightThemeOptions: ThemeOptions = {
  shape: {
    borderRadius: 16,
  },
  palette: {
    background: {
      default: "#efefef",
      paper: "#fff",
    },
    primary: {
      light: teal[500],
      main: teal[800],
      dark: teal[900],
    },
    secondary: {
      main: "#2B2B2B",
    },
    trinary: {
      main: "#d1d1d6",
    },
    error: {
      main: red[500],
      light: red[300],
      dark: red[700],
    },
    mode: "light",
  },
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
          src: local('Poppins'), local('Poppins-Regular'), url(https://fonts.gstatic.com/s/poppins/v15/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
          unicodeRange: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF;
        }
      `,
    },
    MuiTextField: {
      defaultProps: {
        autoComplete: 'off',
      },
    },
    MuiInput: {
      defaultProps: {
        autoComplete: 'off',
      },
    },
  },
};

// Create the actual theme objects from the options
export const darkTheme = createTheme(darkThemeOptions);
export const lightTheme = createTheme(lightThemeOptions);
