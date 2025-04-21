from fastapi import APIRouter, Depends, HTTPException, Request
from utils.auth_user import get_current_user
from models.user import User, WatchListPortfolioStock
from pydantic import BaseModel
from typing import List
from cache.manager import CacheManager
from models.stock import Stock
import yfinance as yf


router = APIRouter(tags=["watchlist"])

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
    # Convert time range to yfinance period and interval
    period_map = {
        "1D": ("1d", "5m"),
        "5D": ("5d", "15m"),
        "1M": ("1mo", "1d"),
        "6M": ("6mo", "1d"),
        "1Y": ("1y", "1d"),
        "5Y": ("5y", "1wk"),
    }
    
    period, interval = period_map.get(request.timeRange, ("1mo", "1d"))
    
    result = []
    
    for ticker in request.tickers:
        try:
            # Try to get data from cache first
            cached_stock_data = await cache_manager.get_historical_stock_data_for_ticker(
                ticker, 
                request.timeRange, 
                request.metrics
            )
            
            if cached_stock_data:
                result.append(cached_stock_data)
                continue
            
            # If not in cache, fetch data from yfinance
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval=interval)
            
            if hist.empty:
                continue
                
            # Process historical data
            historical_points = []
            
            for date, row in hist.iterrows():
                point = {
                    "date": date.strftime("%Y-%m-%d") if interval in ["1d", "1wk"] else date.strftime("%Y-%m-%d %H:%M"),
                    "price": float(row["Close"]),
                }
                
                # Add additional metrics if requested
                if "volume" in request.metrics:
                    point["volume"] = float(row["Volume"]) if "Volume" in row else 0
                
                # Calculate percent change from first point
                if "percent_change" in request.metrics and len(historical_points) > 0:
                    first_price = historical_points[0]["price"]
                    point["percent_change"] = ((point["price"] - first_price) / first_price) * 100
                
                historical_points.append(point)
            
            # Get additional stock info for other metrics
            info = stock.info
            
            # Add additional stock-level metrics if needed
            stock_data = {
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "historical": historical_points,
            }
            
            # Add PE ratio if requested
            if "pe_ratio" in request.metrics:
                for point in historical_points:
                    point["pe_ratio"] = float(info.get("trailingPE", 0))
            
            # Add market cap if requested
            if "market_cap" in request.metrics:
                for point in historical_points:
                    point["market_cap"] = float(info.get("marketCap", 0))
            
            result.append(stock_data)
            
        except Exception as e:
            # Log error but continue with other stocks
            print(f"Error fetching data for {ticker}: {str(e)}")
            continue
    
    return result