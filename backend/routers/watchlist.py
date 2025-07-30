import asyncio
from logging import log
import logging
from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel, Field
from ibkr_service import IBKRService
from typing import Dict, List, Literal
from deps import get_ibkr_service 
from constants import CRYPTO_SYMBOLS, PERIOD_BAR 

router = APIRouter(prefix="/watchlists", tags=["Watchlist"])
log = logging.getLogger(__name__)

# ---------------------- models ------------------------------
    
class Instrument(BaseModel):
    ticker: str
    conid: int | str
    name: str | None = None
    assetClass: str | None = None

class WatchlistDetail(BaseModel):
    id: str
    name: str
    instruments: List[Instrument]
    
class HistoricalReq(BaseModel):
    tickers: List[str] = Field(..., min_items=1)
    sec_types: Dict[str, str] | None = None 
    timeRange: Literal['1D', '7D', '1M', '3M', '6M', '1Y']

class HistoricalPoint(BaseModel):
    date: int     # unix seconds
    price: float

class StockHistorical(BaseModel):
    ticker: str
    historical: List[HistoricalPoint]

# ---------- helper to turn /history row → point ----------
def _row_to_point(row: dict) -> HistoricalPoint:
    return {"date": row["t"] // 1000, "price": row["c"]}

# ---------------------- routes ------------------------------

@router.get("", response_model=dict[str, str])
async def list_watchlists(svc: IBKRService = Depends(get_ibkr_service)):
    data = await svc.account_watchlists()
    if data is None:
        raise HTTPException(500, "Could not fetch watch-lists")
    return data                     # { "123":"Tech Growth", … }

@router.get("/detail", response_model=WatchlistDetail)
async def get_watchlist(id: str, svc: IBKRService = Depends(get_ibkr_service)):
    res = await svc._req("GET", "/iserver/watchlist", params={"id": id})
    if res is None:
        raise HTTPException(500, "Failed to fetch watch-list")
    instruments = []
    for i in res.get("instruments", []):
        ticker = i.get("ticker") or i.get("symbol") or i.get("localSymbol")
        if not ticker:           # skip bad rows
            continue
        instruments.append({
            "ticker": ticker,
            "conid":  i.get("conid") or i.get("C"),
            "name":   i.get("name"),
            "assetClass": i.get("assetClass") or i.get("secType"),
        })
    return {
        "id":   res.get("id", id),
        "name": res.get("name", ""),
        "instruments": instruments,
    }

@router.post("/historical", response_model=list[StockHistorical])
async def batch_history(req: HistoricalReq, svc: IBKRService = Depends(get_ibkr_service)):
    per, bar = PERIOD_BAR[req.timeRange]
    recs: list[StockHistorical] = []
    
    # Create a semaphore to limit concurrency to a safe number (e.g., 2)
    semaphore = asyncio.Semaphore(2)

    async def fetch_history_for_symbol(symbol: str):
        async with semaphore: # This will wait if 2 tasks are already running
            sec_hint = req.sec_types.get(symbol) if req.sec_types else None
            conid = await svc.get_conid(symbol, sec_type=sec_hint)
            if not conid:
                return None

            try:
                # Add a small delay to be even more gentle on the API
                await asyncio.sleep(0.5) 
                raw = await svc.history(conid, period=per, bar=bar)
                if not raw.get("data"):
                    return None
                
                points = [{"date": r["t"] // 1000, "price": r["c"]} for r in raw["data"]]
                return {"ticker": symbol, "historical": points}
                
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 500 and b"Chart data unavailable" in exc.response.content:
                    log.warning(f"Chart data unavailable for {symbol}")
                    return None
                # Let other errors propagate up
                raise

    # Create all tasks and run them concurrently (respecting the semaphore limit)
    tasks = [fetch_history_for_symbol(symbol) for symbol in req.tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results, filtering out None values and raising any unexpected errors
    final_recs = []
    for res in results:
        if isinstance(res, Exception):
            # You might want to log this error but not fail the entire request
            log.error(f"Failed to fetch historical data for a ticker: {res}")
        elif res is not None:
            final_recs.append(res)
            
    return final_recs
