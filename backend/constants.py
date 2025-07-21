CRYPTO_SYMBOLS: set[str] = {
    "BTC", "ETH", "SOL", "DOGE", "ADA",
    "XRP", "LTC", "BCH", "DOT", "MATIC",
    # add anything else you support
}

PERIOD_BAR = {
    "1D": ("1d", "5min"),    # 1 day of data with 5-minute bars
    "7D": ("1w", "30min"),   # 1 week of data with 30-minute bars
    "1M": ("1m", "2h"),      # 1 month of data with 2-hour bars
    "3M": ("3m", "1d"),      # 3 months of data with daily bars
    "1Y": ("1y", "1d"),      # 1 year of data with daily bars
    "5Y": ("5y", "1w"),      # 5 years of data with weekly bars
}