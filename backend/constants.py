CRYPTO_SYMBOLS: set[str] = {
    "BTC", "ETH", "SOL", "DOGE", "ADA",
    "XRP", "LTC", "BCH", "DOT", "MATIC",
    # add anything else you support
}

PERIOD_BAR = {
    "1D": ("1d", "2min"), "7D": ("1w", "15min"), "1M": ("1m", "1h"),
    "3M": ("3m", "3h"),   "6M": ("6m", "1d"),    "1Y": ("1y", "1d"),
}