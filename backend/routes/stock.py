
from typing import Any, Dict, List
from util.api_key import get_api_key
from fastapi import APIRouter, HTTPException, status, Depends
from models.stock import Stock
from jwt import get_current_user
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


@router.post("/add_stock")
async def add_stock(stock_data: Stock):
    # Check if the stock already exists in the database
    stock = await Stock.find_one(Stock.ticker == stock_data.ticker)

    # If the stock doesn't exist, create a new one
    if not stock:
        stock = stock_data
        await stock.save()

    return {"message": "Stock added successfully"}

@router.put("/update_stock_price/{ticker}")
async def update_stock_price(ticker: str, user: User = Depends(get_current_user), api_key: ApiKey = Depends(get_api_key)):
    price = None
    try:
        url = f"https://financialmodelingprep.com/api/v3/quote-short/{ticker}?apikey={api_key.key}"
        response = requests.get(url).json()
        price = response[0]['price']
    except Exception as e:
        print(f"Error with API key {api_key}: {str(e)}")  # Print the error and continue with the next key

    try:
        stock = await Stock.find_one(Stock.ticker == ticker)
        await stock.set({Stock.price:price})
        await user.set({User.last_refresh: datetime.now()})  
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/delete/{ticker}", response_description="Delete stock")
async def delete_stock(ticker: str, user: User = Depends(get_current_user)):
    existing_stock = await Stock.find_one(Stock.ticker == ticker)
    if existing_stock is None:
        raise HTTPException(status_code=404, detail=f"Stock with ticker {ticker} does not exist")
    await existing_stock.delete()
    return {"message": "Stock deleted successfully"}


