import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from helpers import safe_float
from utils.auth_user import get_current_user
from models.user import User, WatchListPortfolioStock
from pydantic import BaseModel
from typing import List
from cache.manager import CacheManager
import yfinance as yf


router = APIRouter(tags=["watchlist"])
logger = logging.getLogger(__name__)


class WatchlistAdd(BaseModel):
    ticker: str

class PortfolioUpdate(BaseModel):
    watchlist_portfolio: List[WatchListPortfolioStock]


@router.post("/toggle", response_description="Add stock to watchlist")
async def add_to_watchlist(
    rawData: WatchlistAdd,
    request: Request,
    user: User = Depends(get_current_user),
):
    ticker = rawData.ticker.upper()
    # Check if stock exists
    # stock = await Stock.find_one(Stock.ticker == ticker)
    # if not stock:
    #     raise HTTPException(status_code=404, detail="Stock not found")
    
    if ticker not in user.watchlist:
        user.watchlist.append(ticker)
    elif ticker in user.watchlist:
        user.watchlist.remove(ticker)
        user.watchlist_portfolio = [ps for ps in user.watchlist_portfolio if ps.ticker != ticker]
    await user.save()
    # Update cache
    cache_manager = CacheManager(request)
    await cache_manager.cache_user(user)
    return {"message": f"{ticker} added to watchlist"}

@router.post("/remove", response_description="Remove stock from watchlist")
async def remove_from_watchlist(
    rawData: WatchlistAdd,
    request: Request,
    user: User = Depends(get_current_user),
):
    ticker = rawData.ticker.upper()
    if ticker in user.watchlist:
        user.watchlist.remove(ticker)
        # Remove from watchlist_portfolio if present
        user.watchlist_portfolio = [ps for ps in user.watchlist_portfolio if ps.ticker != ticker]
        await user.save()
        # Update cache
        cache_manager = CacheManager(request)
        await cache_manager.cache_user(user)
    else:
        raise HTTPException(status_code=404, detail="Stock not in watchlist")
    return {"message": f"{ticker} removed from watchlist"}

@router.post("/portfolio", response_description="Update watchlist portfolio")
async def update_portfolio(
    rawData: PortfolioUpdate,
    user: User = Depends(get_current_user),
    request: Request = None
):
    # Validate tickers
    valid_tickers = set(user.watchlist)
    for ps in rawData.watchlist_portfolio:
        if ps.ticker not in valid_tickers:
            raise HTTPException(status_code=400, detail=f"{ps.ticker} not in watchlist")
        if ps.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    user.watchlist_portfolio = rawData.watchlist_portfolio
    await user.save()
    # Update cache
    cache_manager = CacheManager(request)
    await cache_manager.cache_user(user)
    return {"message": "Watchlist portfolio updated"}


class HistoricalDataRequest(BaseModel):
    tickers: List[str]
    timeRange: str  # 1D, 5D, 1M, 6M, 1Y, 5Y
    metrics: List[str] = ["price"]  # price, pe_ratio, volume, market_cap, percent_change

@router.post("/historical", response_description="Get historical stock data")
async def get_historical_data(
    request: HistoricalDataRequest,
    user: User = Depends(get_current_user),
    request_obj: Request = None,
):
    cache_manager = CacheManager(request_obj)
    period_map = {
        "1D": ("1d", "5m"),
        "5D": ("5d", "15m"),
        "1M": ("1mo", "1d"),
        "6M": ("6mo", "1d"),
        "1Y": ("1y", "1d"),
        "5Y": ("5y", "1wk"),
    }
    
    period, interval = period_map.get(request.timeRange, ("1mo", "1d"))

    ttl_map = {
        "1D": 900,      # 15 minutes
        "5D": 1800,     # 30 minutes
        "1M": 3600 * 4, # 4 hours
        "6M": 3600 * 8, # 8 hours
        "1Y": 86400,    # 1 day
        "5Y": 86400,    # 1 day
    }
    cache_ttl = ttl_map.get(request.timeRange, 3600)

    result = []
    
    for ticker in request.tickers:
        try:
            sorted_metrics_tuple = tuple(sorted(request.metrics))  # e.g., ('price',)
            cached_stock_data = await cache_manager.get_historical_stock_data_for_ticker(
                ticker, request.timeRange, sorted_metrics_tuple
            )
            
            if cached_stock_data:
                # logger.info(f"Cache hit for {ticker} ({request.timeRange} / {sorted_metrics_tuple})")
                result.append(cached_stock_data)
                continue
            
            logger.info(f"Cache miss for {ticker} ({request.timeRange} / {sorted_metrics_tuple}). Fetching from yfinance...")
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval=interval)
            
            if hist.empty:
                logger.warning(f"No historical data found for {ticker} for period {period}")
                continue
                
            historical_points = []
            for date, row in hist.iterrows():
                price = safe_float(row.get("Close"))
                if price is None:
                    logger.warning(f"Skipping data point for {ticker} on {date} due to invalid price")
                    continue

                point = {
                    "date": date.strftime("%Y-%m-%d") if interval in ["1d", "1wk"] else date.strftime("%Y-%m-%d %H:%M"),
                    "price": price,
                }
                historical_points.append(point)

            if historical_points:
                stock_data = {
                    "ticker": ticker,
                    "name": stock.info.get("shortName", ticker),
                    "historical": historical_points,
                }

                try:
                    await cache_manager.set_historical_stock_data_for_ticker(
                        ticker=ticker,
                        time_range=request.timeRange,
                        metrics=sorted_metrics_tuple,
                        data=stock_data,
                        ttl_seconds=cache_ttl
                    )
                    # logger.info(f"Cached data for {ticker} ({request.timeRange} / {sorted_metrics_tuple}) with TTL {cache_ttl}s")
                except Exception as cache_e:
                    logger.warning(f"Failed to cache data for {ticker}: {cache_e}")

                result.append(stock_data)
            else:
                logger.warning(f"No valid historical points processed for {ticker} for period {period}")

        except Exception as e:
            logger.error(f"Error processing ticker {ticker}: {type(e).__name__} - {str(e)}")
            continue
    
    return result