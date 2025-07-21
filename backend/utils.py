# utils.py
import logging
import math
import re
import sys
from typing import Any

def setup_logging(level="INFO"):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    # You might want to suppress verbose logs from libraries if needed
    # logging.getLogger("websockets").setLevel(logging.WARNING)
    # logging.getLogger("httpx").setLevel(logging.WARNING)
    
def safe_float_conversion(value: Any) -> float | None:
    """Safely converts a value to a float, handling None, strings, etc."""
    if value is None:
        return None
    try:
        # Handles cases where price is a string like "C150.5" or just a number
        price_str = str(value).lstrip("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        if price_str and price_str.strip():
            return float(price_str)
    except (ValueError, TypeError):
        return None
    return None

def safe_string(value, default: str = "") -> str:
            return str(value).strip() if value else default
        
def try_float(val):
        try:
            return float(val)
        except (TypeError, ValueError):
            return None
        
def clean_nan_values(d: dict) -> dict:
    """Recursively converts all NaN values in a dictionary to None."""
    for key, value in d.items():
        if isinstance(value, float) and math.isnan(value):
            d[key] = None
        elif isinstance(value, dict):
            clean_nan_values(value)
    return d

def has_market_data(snapshot: dict) -> dict:
        availability_code = snapshot.get("6509")
        if not availability_code:
            return {"code": None, "subscribed": False, "type": None}
        code = availability_code[0]
        type_ = {
            "R": "real-time",
            "D": "delayed",
            "Z": "frozen",
            "Y": "frozen delayed",
            "N": "not subscribed",
            "O": "incomplete agreement"
        }.get(code, "unknown")
        return {
            "code": availability_code,
            "subscribed": code in ("R", "D", "Z", "Y"),
            "type": type_,
        }
        
def price_delta(snap: list[dict]) -> dict:
    
    """
    Simplified and enhanced price_delta that works with options and stocks.
    """
    if not snap or not isinstance(snap, list) or not snap[0]:
        return {"error": "Invalid or empty snapshot received"}

    src = snap[0]
    
    # Immediately check if we have any price data. If not, fail fast.
    if "31" not in src and "7635" not in src:
         # Log the problematic response for debugging
        logging.warning(f"Snapshot for conid {src.get('conid')} contained no price data: {src}")
        status_info = has_market_data(src) # Check if there's a status code
        return {
            "error": "Market data not found in response. Check subscriptions.",
            "market_data_status": status_info.get("type", "unknown"),
            "market_data_code": status_info.get("code")
        }

    # --- Proceed with parsing if data exists ---
    
    status_info = has_market_data(src)

    # Simplified Price Extraction Logic
    last = safe_float_conversion(src.get("31"))
    mark = safe_float_conversion(src.get("7635"))
    
    # Use the best available price (prioritize Last over Mark)
    best_price = last if last is not None else mark

    prev = safe_float_conversion(src.get("7741"))  # Previous Close
    pct = safe_float_conversion(src.get("83"))     # Change %
    
    # Calculate change amount based on the best available price
    change_amount = (best_price - prev) if best_price is not None and prev is not None else None

    return {
        "market_data_status": status_info["type"],
        "last_price": best_price, 
        "previous_close": prev,
        "change_percent": pct,
        "change_amount": change_amount,
        "dayHigh": safe_float_conversion(src.get("70")),
        "dayLow": safe_float_conversion(src.get("71")),
    }


def parse_option_symbol(ticker: str):
    """Parse option symbol like 'IBIT Jul31'25 65 Call' into components"""
    # This is a simplified parser - you might need to adjust based on your format
    pattern = r'^([A-Z]+)\s+([A-Za-z0-9\']+)\s+(\d+(?:\.\d+)?)\s+(Call|Put)$'
    match = re.match(pattern, ticker, re.IGNORECASE)
    
    if match:
        underlying, exp_str, strike, right = match.groups()
        return {
            'underlying': underlying,
            'expiry': exp_str,
            'strike': float(strike),
            'right': right.upper()
        }
    return None
