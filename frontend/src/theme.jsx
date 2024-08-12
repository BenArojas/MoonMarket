import { createTheme } from "@mui/material";

export const darkTheme = createTheme({
  shape: {
    borderRadius: 16,
  },
  palette: {
    background: {
      default: "#0b0b0b"
      // default: "#2B2B2B",
      // default: "#060817",
      // default:'#15202B'
    },
    primary: {
      main: "#077e5d", // metalic green
    },
    secondary: {
      main: "#E1E5EB", // light grey
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
  },
});
