
from fastapi import APIRouter, HTTPException, status, Depends
from models.stock import Stock
from util.current_user import current_user
from models.user import User
from decouple import config
import requests
from datetime import datetime

router = APIRouter(prefix="/stocks", tags=["Stock"])
BASE_URL = 'https://financialmodelingprep.com/api/v3'

# request from FMP API
@router.get("/quote/{symbol}", response_description="stock details from api")
def get_quote(symbol: str):
    
    api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY"), config("FMP_THIRD_API_KEY"), config("FMP_FOURTH_API_KEY")]
    for key in api_keys:
        try:
            endpoint = f'/quote/{symbol}?apikey={key}'
            url = BASE_URL + endpoint
            print('fetching data')
            response = requests.get(url)
            data1 = response.json()[0]

            # Try first API key for company info request
            companyInfoUrl = f'https://financialmodelingprep.com/api/v3/profile/{symbol}?apikey={key}'
            companyInfoRes = requests.get(companyInfoUrl)
            data2 = companyInfoRes.json()[0]

            # Combine the two JSON objects
            combined_data = {**data1, **data2}
            return combined_data
        except Exception as e:
            print( {"error": str(e)})
        
# Requests from Stock collection
@router.get("/", response_description="list of all stocks in portfolio")
async def list_stocks( user: User = Depends(current_user)):
    stocks = await Stock.find_all().to_list()
    return stocks

@router.get("/dailyChart/{ticker}")



@router.get("/{ticker}")
async def get_stock(ticker: str,  user: User = Depends(current_user)):
    symbol = ticker.upper()
    if stock := await Stock.find_one(Stock.ticker == symbol):
        return stock
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stock with ticker {ticker} does not exist")

@router.get("/historicalPrice/{ticker}")
async def get_historicalPrice(ticker: str, user: User =Depends(current_user)):
    api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY")]
    for key in api_keys:
        try:
            endpoint = f'/historical-price-full/{ticker}?apikey={key}'
            url = BASE_URL + endpoint
            response = requests.get(url)
        except Exception as e:
            return {"error": str(e)}
    

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
async def update_stock_price(ticker: str, user: User = Depends(current_user)):
    api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY")]
    price = None
    for key in api_keys:
        try:
            url = f"https://financialmodelingprep.com/api/v3/quote-short/{ticker}?apikey={key}"
            response = requests.get(url).json()
            price = response[0]['price']
            break  # Exit the loop once you get the price
        except Exception as e:
            print(f"Error with API key {key}: {str(e)}")  # Print the error and continue with the next key
    if price is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="All API keys failed")
    try:
        stock = await Stock.find_one(Stock.ticker == ticker)
        await stock.set({Stock.price:price})
        await user.set({User.last_refresh: datetime.now()})  
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/delete/{ticker}", response_description="Delete stock")
async def delete_stock(ticker: str, user: User = Depends(current_user)):
    existing_stock = await Stock.find_one(Stock.ticker == ticker)
    if existing_stock is None:
        raise HTTPException(status_code=404, detail=f"Stock with ticker {ticker} does not exist")
    await existing_stock.delete()
    return {"message": "Stock deleted successfully"}