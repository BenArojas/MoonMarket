from logging import log
import logging
from fastapi import APIRouter, Depends, HTTPException
import httpx
from utils import safe_float_conversion
from ibkr_service import IBKRService, _extract_best_price_from_snapshot
from models import ChartDataBars
from typing import List
from deps import get_ibkr_service 
from constants import CRYPTO_SYMBOLS, PERIOD_BAR 
log = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["Market"])


# # Define the period to IBKR parameters mapping
# # Frontend Period -> { IBKR API period, Default IBKR API bar }
# PERIOD_BAR_MAPPING = {
#     "1D": {"period_ibkr": "1d", "bar_ibkr": "2min"},  
#     "7D": {"period_ibkr": "1w", "bar_ibkr": "15min"},  
#     "1M": {"period_ibkr": "1m", "bar_ibkr": "1h"},    
#     "3M": {"period_ibkr": "3m", "bar_ibkr": "3h"},    
#     "6M": {"period_ibkr": "6m", "bar_ibkr": "1d"},    
#     "1Y": {"period_ibkr": "1y", "bar_ibkr": "1d"},     
# }





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
    if not snap:
        # Handle cases where the snapshot is empty
        return {"error": "Empty snapshot received"}

    src = snap[0]
    status_info = has_market_data(src)

    # Use the robust price extraction logic
    last = _extract_best_price_from_snapshot(src)

    # Extract other fields using the safe conversion helper
    prev = safe_float_conversion(src.get("7741")) # Previous Close
    pct = safe_float_conversion(src.get("83"))   # Change %
    bid = safe_float_conversion(src.get("84"))
    ask = safe_float_conversion(src.get("86"))
    mark = safe_float_conversion(src.get("7635")) # Already used in `last` logic, but good to have separately

    # Calculate change amount
    change_amount = (last - prev) if last is not None and prev is not None else None

    return {
        "market_data_status": status_info["type"],
        "market_data_code": status_info["code"],
        "last_price": last,
        "previous_close": prev,
        "change_percent": pct,
        "change_amount": change_amount,
        "bid": bid,
        "ask": ask,
        "mark": mark,
    }



@router.get("/quote/{ticker}")
async def getStockQuote(ticker:str, ibkr_service: IBKRService = Depends(get_ibkr_service)):
    sec_type = "CRYPTO" if ticker.upper() in CRYPTO_SYMBOLS else "STK"
    try:
        conid = await ibkr_service.get_conid(ticker, sec_type=sec_type)
        if not conid:
            raise HTTPException(status_code=404, detail=f"Could not find conid for ticker '{ticker}'.")

        # market_data_sub = await ibkr_service.check_market_data_subscriptions()
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