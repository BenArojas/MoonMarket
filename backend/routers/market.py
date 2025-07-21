import datetime
from logging import log
import logging
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException
import httpx
from utils import price_delta, safe_float_conversion
from ibkr_service import IBKRService
from models import ChartDataBars, ConidResponse, OptionsChainResponse, SearchResult
from deps import get_ibkr_service 
from constants import CRYPTO_SYMBOLS, PERIOD_BAR 
log = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["Market"])

@router.get("/history", response_model=list[ChartDataBars])
async def history(
        conid: int,
        period: str = "1M",
        svc: IBKRService = Depends(get_ibkr_service),
):
    # --- YTD Calculation Logic ---
    if period == "YTD":
        today = datetime.date.today()
        start_of_year = datetime.date(today.year, 1, 1)
        # Calculate number of days for the 'd' period format
        days_since_start = (today - start_of_year).days + 1 
        period_ibkr = f"{days_since_start}d"
        bar_ibkr = "1d"  # Daily bars for YTD
    elif period in PERIOD_BAR:
        period_ibkr, bar_ibkr = PERIOD_BAR[period]
    else:
        raise HTTPException(400, "Invalid period specified")
    try:
        raw = await svc.history(conid, period=period_ibkr, bar=bar_ibkr)
    except httpx.HTTPStatusError as exc:
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


@router.get("/quote/{conid}")
async def get_stock_quote(conid: int, ibkr_service: IBKRService = Depends(get_ibkr_service)):    
    try:
        if not conid:
            raise HTTPException(status_code=404, detail="Invalid conid.")

        fields_to_fetch = [
            "31",   # Last Price
            "55",   # Ticker Symbol
            "7635", # Mark Price
            "82",   # Change Amount
            "83",   # Change %
            "70",   # High
            "71",   # Low
            "84",   # Bid
            "86",   # Ask
            "7741", # Prior Close
            "7051", # Company Name
            "6509"  # Market Data Availability
        ]

        raw_data = await ibkr_service.snapshot(conids=[conid], fields=fields_to_fetch)
        log.info(f"raw data is {raw_data}")
        if not raw_data:
            raise HTTPException(status_code=404, detail="No market data available")
        data = raw_data[0]
        log.info(f"data is: {data}")
        
        price_data = price_delta(raw_data)
        # Extract the extra fields we need
        company_name = data.get("7051", "Unknown")
        ticker = data.get("55", "Unknown") 
        bid = safe_float_conversion(raw_data[0].get("84"))
        ask = safe_float_conversion(raw_data[0].get("86"))
        
        return {
        "ticker": ticker,
        "conid": conid,
        "companyName": company_name,
        "bid": bid,
        "ask": ask,
        "lastPrice": price_data.get("last_price"),
        "changePercent": price_data.get("change_percent"),
        "changeAmount": price_data.get("change_amount"),
        "dayHigh": price_data.get("high"),
        "dayLow": price_data.get("low"),
        "previousClose": price_data.get("previous_close"),
        "marketDataStatus": raw_data[0].get("6509_f", "unknown") # Example for status
        }
         
    except Exception as e:
        log.error(e)
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")
    

@router.get("/search", response_model=List[SearchResult])
async def search_securities(
    query: str, 
    svc: IBKRService = Depends(get_ibkr_service)
):
    try:
        raw_results = await svc.search(symbol=query, name=False)
        
        # --- THE FIX IS HERE ---
        # Manually construct the response list to ensure correct mapping.
        formatted_results = []
        for item in raw_results:
            # Skip results that don't even have a conid
            if not item.get('conid') or int(item.get('conid')) == -1:
                continue

            formatted_results.append(
                SearchResult(
                    conid=item.get('conid'),
                    symbol=item.get('symbol'),
                    companyName=item.get('companyHeader'), 
                    secType=item.get('secType')
                )
            )
        return formatted_results
        
    except Exception:
        log.exception("Unexpected /search error")
        return []
    
@router.get("/options/chain/{underlying_conid}", response_model=OptionsChainResponse)
async def get_options_chain(
    underlying_conid: int,
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Constructs and returns an options chain for a given underlying contract ID.
    """
    try:
        # Step 1: Search for the underlying to get available option months.
        # The 'sections' array in the search result contains this.
        search_results = await svc.search_detailed(underlying_conid) # We need a search function that returns 'sections'
        
        if not search_results or not search_results.get('sections'):
            raise HTTPException(status_code=404, detail="No options data found for this conid.")

        # Find the 'OPT' section to get the months
        opt_section = next((s for s in search_results['sections'] if s.get('secType') == 'OPT'), None)
        if not opt_section or not opt_section.get('months'):
            raise HTTPException(status_code=404, detail="No option expiration months found.")

        # Months are returned as a semicolon-separated string, e.g., "JUL25;AUG25;SEP25"
        months = opt_section['months'].split(';')
        
        chain_data: Dict[str, List[float]] = {}

        # Step 2: For each month, fetch the available strike prices.
        for month in months:
            if not month: continue
            strike_data = await svc.strikes(conid=underlying_conid, month=month)
            # The API returns strikes for both calls and puts. We'll combine them and remove duplicates.
            if strike_data and ('call' in strike_data or 'put' in strike_data):
                all_strikes = set(strike_data.get('call', [])) | set(strike_data.get('put', []))
                chain_data[month] = sorted(list(all_strikes))

        return {"expirations": chain_data}

    except Exception as e:
        log.exception(f"Failed to build options chain for conid {underlying_conid}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/conid/{ticker}", response_model=ConidResponse)
async def get_conid_for_ticker(
    ticker: str, 
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Finds the most likely conid for a given ticker symbol.
    """
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol is required.")
    try:
        # Use the existing search service
        results = await svc.search(symbol=ticker, name=False)        
        for item in results:
            if item.get('conid'):
                return {
                    "conid": int(item.get('conid')),
                    "companyName": item.get('companyHeader', ticker)
                }
        
        # If no STK is found, return the first valid result of any type
        for item in results:
             if item.get('conid'):
                  return {
                    "conid": int(item.get('conid')),
                    "companyName": item.get('companyHeader', ticker)
                }

        raise HTTPException(status_code=404, detail=f"No valid contract found for ticker {ticker}")

    except Exception:
        log.exception(f"Error finding conid for {ticker}")
        raise HTTPException(status_code=500, detail="Failed to resolve ticker to conid.")