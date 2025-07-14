// src/constants/paths.ts

export const Paths = {
  public: {
    // The login page is at the root
    login: "/",
  },
  protected: {
    // Full path for the account selection page
    accountSelection: "/account-selection",

    app: {
      // Base path for reference, though not used for navigation
      base: "/app",

      // --- Absolute paths for navigation and routing ---
      home: "/app/home",
      profile: "/app/profile",
      global: "/app/global",
      scanner: "/app/scanner",
      transactions: "/app/transactions",
      watchlist: "/app/watchlist",

      // --- Dynamic Path Handling ---
      // For the router's <Route path="..."> definition
      stockBase: "/app/stock/:stockTicker",
      // For programmatic navigation with navigate()
      stock: (stockTicker: string) => `/app/stock/${stockTicker}`,
    },
  },
  // Fallback route
  notFound: "*",
};