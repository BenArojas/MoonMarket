# utils.py
import logging
import re
import sys

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
    
def safe_float_conversion(value: str, default: float = 0.0) -> float:
    """
    Safely convert a string to float, handling various formats like:
    - 'C66.54' -> 66.54
    - '$123.45' -> 123.45
    - '1,234.56' -> 1234.56
    - 'N/A' -> default value
    """
    if not value or value in ['N/A', 'null', 'None', '']:
        return default
    
    # Convert to string if it's not already
    str_value = str(value).strip()
    
    # Remove common prefixes/suffixes and formatting
    # This regex keeps only digits, decimal points, and minus signs
    cleaned = re.sub(r'[^\d\.-]', '', str_value)
    
    try:
        return float(cleaned) if cleaned else default
    except (ValueError, TypeError):
        return default

def safe_string(value, default: str = "") -> str:
            return str(value).strip() if value else default
        