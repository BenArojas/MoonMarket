# utils.py
import logging
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