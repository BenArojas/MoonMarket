
import asyncio
from typing import Any, Dict, List
from utils.api_key import get_api_key
from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.stock import Stock, PortfolioRequest
from utils.auth_user import get_current_user
from models.user import User
import requests
from datetime import datetime, timedelta
from models.APIKeyManager import ApiKey


router = APIRouter(tags=["Stock"])
BASE_URL = 'https://financialmodelingprep.com/api/v3/'


@router.get("/historical_data/{symbol}", response_description="Stock details from API")
async def get_historical_data(symbol: str, api_key: ApiKey = Depends(get_api_key)) -> Dict[str, Any]:
    endpoint = f'historical-price-full/{symbol}'
    url = f"{BASE_URL}{endpoint}?apikey={api_key.key}"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        await api_key.increment_usage()
        historical_stock_price = response.json()
        return historical_stock_price  # Return the data if successful
    except Exception as e:
        # For any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/intraday_chart/{symbol}")
def get_intraday_chart(symbol: str, range: str = '1month', api_key: ApiKey = Depends(get_api_key)):
    # Define timeframes and their corresponding FMP timeframe and date range
    timeframes = {
        '1week': ('5min', 7),
        '1month': ('30min', 30),
        '3months': ('1hour', 90),
        '6months': ('4hour', 180),
        '1year': ('daily', 365),
        '3years': ('daily', 1095)
    }
    
    fmp_timeframe, days = timeframes.get(range, ('30min', 30))  # Default to 1 month if invalid range
    
    current_date = datetime.now()
    from_date = current_date - timedelta(days=days)
    
    try:
        if range in ['1year', '3years']:
            endpoint = f'historical-price-full/{symbol}'
            url = f"{BASE_URL}{endpoint}?from={from_date.strftime('%Y-%m-%d')}&to={current_date.strftime('%Y-%m-%d')}&apikey={api_key.key}"
        else:
            endpoint = f'historical-chart/{fmp_timeframe}/{symbol}'
            url = f"{BASE_URL}{endpoint}?from={from_date.strftime('%Y-%m-%d')}&to={current_date.strftime('%Y-%m-%d')}&apikey={api_key.key}"
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if range in ['1year', '3years']:
            return data.get('historical', [])
        else:
            return data
    except requests.RequestException as e:
        print(f"Error with API key {api_key.key}: {str(e)}")
    
    return {"error": "Unable to fetch data with any of the provided API keys"}

@router.get("/quote/{symbol}")
def get_stock_quote(symbol:str,api_key: ApiKey = Depends(get_api_key)):
    
    try:
        endpoint = f'quote/{symbol}'
        url = f"{BASE_URL}{endpoint}?apikey={api_key.key}"
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        stock_quote = response.json()
        return stock_quote
    except requests.RequestException as e:
        print(f"Error with API key {api_key}: {str(e)}")

    
# Requests from Stock collection
@router.get("/", response_description="list of all stocks in portfolio")
async def list_stocks( user: User = Depends(get_current_user)):
    stocks = await Stock.find_all().to_list()
    return stocks


@router.get("/{ticker}")
async def get_stock(ticker: str,  user: User = Depends(get_current_user)):
    symbol = ticker.upper()
    if stock := await Stock.find_one(Stock.ticker == symbol):
        return stock
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stock with ticker {ticker} does not exist")

@router.post("/portfolio", response_description="Get stocks in user's portfolio")
async def get_user_stocks(
    request: PortfolioRequest,
    user: User = Depends(get_current_user)
):
    if not request.tickers:
        return []
        
    try:
        # Find only the stocks that match the provided tickers
        stocks = await Stock.find({"ticker": {"$in": request.tickers}}).to_list()
        return stocks
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stock data: {str(e)}"
        )

@router.post("/add_stock")
async def add_stock(stock_data: Stock):
    # Check if the stock already exists in the database
    stock = await Stock.find_one(Stock.ticker == stock_data.ticker)

    # If the stock doesn't exist, create a new one
    if not stock:
        stock = stock_data
        await stock.save()

    return {"message": "Stock added successfully"}

@router.put("/update_stock_prices")
async def update_stock_prices(
    request: PortfolioRequest,
    user: User = Depends(get_current_user),
    api_key: ApiKey = Depends(get_api_key)
):
    # Build comma-separated string of tickers
    tickers_string = ','.join(request.tickers)
    
    # Fetch all prices in one API call
    try:
        url = f"https://financialmodelingprep.com/api/v3/quote-short/{tickers_string}?apikey={api_key.key}"
        response = requests.get(url).json()
        
        # Create a map of ticker to price
        price_map = {item['symbol']: item['price'] for item in response}
        
        # Update all stocks in database
        update_operations = []
        for ticker in request.tickers:
            if ticker in price_map:
                stock = await Stock.find_one(Stock.ticker == ticker)
                if stock:
                    update_operations.append(
                        stock.set({Stock.price: price_map[ticker]})
                    )
        
        # Execute all updates
        if update_operations:
            await asyncio.gather(*update_operations)
            
        # Update user's last refresh time
        await user.set({User.last_refresh: datetime.now()})
        
        return {
            "message": "Prices updated successfully",
            "updated_tickers": list(price_map.keys())
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating stock prices: {str(e)}"
        )

@router.delete("/delete/{ticker}", response_description="Delete stock")
async def delete_stock(ticker: str, user: User = Depends(get_current_user)):
    existing_stock = await Stock.find_one(Stock.ticker == ticker)
    if existing_stock is None:
        raise HTTPException(status_code=404, detail=f"Stock with ticker {ticker} does not exist")
    await existing_stock.delete()
    return {"message": "Stock deleted successfully"}