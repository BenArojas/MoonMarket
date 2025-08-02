# utils.py
from datetime import datetime
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



def calculate_days_to_expiry(description: str) -> int | None:
    """
    Parses an IBKR option description using regex to find the YYMMDD date code
    and calculates the days remaining until expiration.
    """
    try:
        # Regex to find the 6-digit date code (yymmdd) inside the brackets []
        match = re.search(r'\[.*?(\d{6})[CP]', description)
        if not match:
            return None

        date_code = match.group(1) # Extracts '250905'
        expiry_date = datetime.strptime(date_code, "%y%m%d")

        # Calculate days remaining from today's date
        # Current date: Monday, July 28, 2025
        delta = expiry_date - datetime.now()
        
        return max(0, delta.days) # Return 0 if expired, otherwise the days left
    except (ValueError, IndexError):
        # Return None if parsing fails for any reason
        return None
    
def format_option_description(description: str) -> str:
    """
    Cleans up an IBKR option contract description for display.
    Example Input: "IBIT   SEP2025 71 C [IBIT  250905C00071000 100]"
    Example Output: "IBIT SEP 2025 71 C"
    """
    if not description:
        return ""
    
    # 1. Remove the bracketed OCC code at the end
    cleaned = re.sub(r'\s*\[.*\]', '', description).strip()
    
    # 2. Normalize multiple spaces into a single space
    normalized_space = re.sub(r'\s+', ' ', cleaned)
    
    # 3. Add a space between the 3-letter month and the 4-digit year (e.g., "SEP2025" -> "SEP 2025")
    final_format = re.sub(r'([A-Z]{3})(\d{4})', r'\1 \2', normalized_space)
    
    return final_format

def extract_price_from_snapshot( snapshot_data: dict) -> float | None:
    """
    Extracts the best available price from snapshot data in a prioritized order.
    Priority: Last Price (31) -> Mark Price (7635).

    Returns the price as a float if available, otherwise None.
    """
    # Attempt to get and convert the last price first.
    price = safe_float_conversion(snapshot_data.get("31"))
    if price is not None:
        return price

    # If the last price is not available, try the mark price.
    price = safe_float_conversion(snapshot_data.get("7635"))
    if price is not None:
        return price

    # If neither price is found, return None.
    return None

def parse_option_symbol(description: str) -> str:
        """
        Parses a long IBKR option description into a clean, readable format.
        Example In: 'IBIT   JUL2025 65 C [IBIT  250731C00065000 100]'
        Example Out: 'IBIT JUL2025 $65.00 C'
        """
        # This new, simpler regex parses the readable part of the string.
        # It captures: 1:Underlying, 2:Expiry, 3:Strike, 4:Type(C/P)
        match = re.search(r"^([A-Z]+)\s+([A-Z]{3}\d{4})\s+([\d\.]+)\s+([CP])", description)

        if match:
            try:
                underlying = match.group(1)
                expiry = match.group(2)  # This is already "JUL2025"
                strike = float(match.group(3))
                option_type = match.group(4)
                
                return f"{underlying} {expiry} ${strike:.2f} {option_type}"
            except (ValueError, IndexError):
                # If parsing fails for any reason, fall back to the original
                return description
        
        # If the regex doesn't match at all, return the original string
        return description