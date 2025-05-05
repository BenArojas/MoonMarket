import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from helpers import fetch_from_fmp, fetch_stock_data_yf
from utils.api_key import get_api_key
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from models.stock import Stock, TickersRequest, StockData
from utils.auth_user import get_current_user
from models.user import User
import requests
from datetime import datetime, timedelta, timezone
from models.APIKeyManager import ApiKey
from cache.manager import CacheManager
import yfinance as yf



router = APIRouter(tags=["Stock"])
BASE_URL = "https://financialmodelingprep.com/api/v3/"


@router.get("/historical_data/{symbol}", response_description="Stock details from API")
async def get_historical_data(
    request: Request, symbol: str, api_key: ApiKey = Depends(get_api_key)
) -> Dict[str, Any]:
    # Try to get from cache first
    redis_client = request.app.state.redis
    cache_key = f"historical_data:{symbol}"

    try:
        # Check cache
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)  # Return cached data if found

        # If not in cache, fetch from API
        one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        endpoint = f"historical-price-full/{symbol}"
        url = f"{BASE_URL}{endpoint}?from={one_year_ago}&apikey={api_key.key}"

        response = requests.get(url)
        response.raise_for_status()
        await api_key.increment_usage(request)

        historical_stock_price = response.json()

        # Store in cache with 2 minute expiration
        await redis_client.setex(
            cache_key, 120, json.dumps(historical_stock_price)  # 2 minutes in seconds
        )

        return historical_stock_price

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get("/intraday_chart/{symbol}")
def get_intraday_chart(
    symbol: str, range: str = "1month", api_key: ApiKey = Depends(get_api_key)
):
    # Define timeframes and their corresponding FMP timeframe and date range
    timeframes = {
        "1week": ("5min", 7),
        "1month": ("30min", 30),
        "3months": ("1hour", 90),
        "6months": ("4hour", 180),
        "1year": ("daily", 365),
        "3years": ("daily", 1095),
    }

    fmp_timeframe, days = timeframes.get(
        range, ("30min", 30)
    )  # Default to 1 month if invalid range

    current_date = datetime.now()
    from_date = current_date - timedelta(days=days)

    try:
        if range in ["1year", "3years"]:
            endpoint = f"historical-price-full/{symbol}"
            url = f"{BASE_URL}{endpoint}?from={from_date.strftime('%Y-%m-%d')}&to={current_date.strftime('%Y-%m-%d')}&apikey={api_key.key}"
        else:
            endpoint = f"historical-chart/{fmp_timeframe}/{symbol}"
            url = f"{BASE_URL}{endpoint}?from={from_date.strftime('%Y-%m-%d')}&to={current_date.strftime('%Y-%m-%d')}&apikey={api_key.key}"

        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if range in ["1year", "3years"]:
            return data.get("historical", [])
        else:
            return data
    except requests.RequestException as e:
        print(f"Error with API key {api_key.key}: {str(e)}")

    return {"error": "Unable to fetch data with any of the provided API keys"}


@router.get("/quote/{symbol}")
async def get_stock_quote(symbol: str):
    ticker = yf.Ticker(symbol)
    info = ticker.info  # Fetch stock info from Yahoo Finance

    # Map Yahoo Finance fields to the expected structure
    stock_quote = {
        "symbol": info.get("symbol", symbol.upper()),
        "price": info.get("regularMarketPrice", 0.0),
        "previousClose": info.get("regularMarketPreviousClose", 0.0),
        "changesPercentage": round(
            ((info.get("regularMarketPrice", 0.0) - info.get("regularMarketPreviousClose", 0.0)) /
             info.get("regularMarketPreviousClose", 1.0)) * 100, 2
        ) if info.get("regularMarketPreviousClose", 0.0) != 0 else 0.0,
        "dayHigh": info.get("regularMarketDayHigh", 0.0),
        "dayLow": info.get("regularMarketDayLow", 0.0),
    }

    return stock_quote

# --- FastAPI Route ---
@router.get(
    "/portfolio", response_description="Get stocks data using yfinance and Redis cache"
)
async def get_user_stocks_redis(
    request: Request,
    user: User = Depends(get_current_user),
):
    if not user.holdings:
        return []

    results = []
    tickers_to_fetch = []
    cache_manager = CacheManager(request)
    tickers_list = [holding.ticker for holding in user.holdings]

    # 1. Check Cache First
    for ticker in tickers_list:
        cached_data: Optional[dict] = await cache_manager.get_stock_info_for_ticker(
            ticker
        )
        if cached_data:
            try:
                results.append(StockData(**cached_data))
            except Exception as e:
                logging.error(f"Error processing cached data for {ticker}: {e}")
                tickers_to_fetch.append(ticker)
        else:
            tickers_to_fetch.append(ticker)

    # 2. Fetch Missing Tickers from yfinance concurrently
    if tickers_to_fetch:
        fetch_tasks = [fetch_stock_data_yf(ticker) for ticker in tickers_to_fetch]
        fetched_data_list = await asyncio.gather(*fetch_tasks)

        # 3. Process Fetched Data and Update Cache
        for stock_data in fetched_data_list:
            ticker = stock_data["ticker"]
            if "error" not in stock_data:
                await cache_manager.cache_stock_info_for_ticker(
                    ticker, stock_data, 1200
                )  
                results.append(StockData(**stock_data))
            else:
                logging.error(
                    f"Failed to fetch data for {ticker}: {stock_data['error']}"
                )
                # Append data with error info
                results.append(StockData(ticker=ticker, error=stock_data["error"]))

    return results




@router.post("/update_stock_prices")
async def update_stock_prices(
    request: Request,
    user: User = Depends(get_current_user),
):
    if not user.holdings:
        return []
    cache_manager = CacheManager(request)
    results = []
    
    tickers_list = [holding.ticker for holding in user.holdings]
    fetch_tasks = [fetch_stock_data_yf(ticker) for ticker in tickers_list]
    fetched_data_list = await asyncio.gather(*fetch_tasks)
    for stock_data in fetched_data_list:
        ticker = stock_data["ticker"]
        if "error" not in stock_data:
            await cache_manager.cache_stock_info_for_ticker(
                ticker, stock_data, 1200
            )  
            results.append({
                "ticker": ticker,
                "status": "success"
            })
        else:
            logging.error(
                f"Failed to fetch data for {ticker}: {stock_data['error']}"
            )
            # Append data with error info
            results.append({
                "ticker": ticker,
                "status": "error"
            })

    return results
    


