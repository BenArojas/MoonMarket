from logging import log
import logging
import re
from fastapi import APIRouter, Depends, HTTPException
import httpx
from utils import safe_float_conversion
from ibkr_service import IBKRService
from models import ChartDataBars
from deps import get_ibkr_service 
from constants import CRYPTO_SYMBOLS, PERIOD_BAR 
log = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["Market"])


@router.get("/history", response_model=list[ChartDataBars])
async def history(
        ticker: str,
        period: str = "1M",
        svc: IBKRService = Depends(get_ibkr_service),
):
    if period not in PERIOD_BAR:
        raise HTTPException(400, "bad period")

    sec_type = "CRYPTO" if ticker.upper() in CRYPTO_SYMBOLS else "STK"
    try:
        conid = await svc.get_conid(ticker, sec_type=sec_type)
        if not conid:
            raise HTTPException(404, "ticker not found")
        
        period_ibkr, bar_ibkr = PERIOD_BAR[period]
        raw = await svc.history(conid, period=period_ibkr, bar=bar_ibkr)
    except httpx.HTTPStatusError as exc:
        # log both status-code and IBKR error JSON
        log.error("IBKR %s  → %s  %s", exc.request.url, exc.response.status_code, exc.response.text)
        raise HTTPException(exc.response.status_code, "IBKR error")
    except Exception as exc:
        log.exception("unexpected /history error")
        raise HTTPException(500, "internal error")

    return [
        {
            "time": row["t"] // 1000,
            "open": row["o"],
            "high": row["h"],
            "low":  row["l"],
            "close": row["c"],
            "value": row["c"],
            "volume": row["v"],
        }
        for row in raw.get("data", [])
    ]

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
        log.warning(f"Snapshot for conid {src.get('conid')} contained no price data: {src}")
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

@router.get("/quote/{ticker}")
async def getStockQuote(ticker: str, ibkr_service: IBKRService = Depends(get_ibkr_service)):
    # Determine security type
    if ticker.upper() in CRYPTO_SYMBOLS:
        sec_type = "CRYPTO"
    elif any(word in ticker.upper() for word in ['CALL', 'PUT']):
        sec_type = "OPT"
    else:
        sec_type = "STK"
    
    try:
        if sec_type == "OPT":
            # For options, you might need to search differently
            # IBKR often requires the underlying symbol for options search
            option_parts = parse_option_symbol(ticker)
            if option_parts:
                # Try searching with underlying symbol first
                conid = await ibkr_service.get_conid(option_parts['underlying'], sec_type="OPT")
            else:
                conid = await ibkr_service.get_conid(ticker, sec_type=sec_type)
        else:
            conid = await ibkr_service.get_conid(ticker, sec_type=sec_type)
            
        if not conid:
            raise HTTPException(status_code=404, detail=f"Could not find conid for ticker '{ticker}'.")

        raw_data = await ibkr_service.snapshot([conid])
        if not raw_data:
            raise HTTPException(status_code=404, detail="No market data available")
        
        price_data = price_delta(raw_data)
        
        return {
            "ticker": ticker,
            "conid": conid,
            **price_data
        }
         
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")