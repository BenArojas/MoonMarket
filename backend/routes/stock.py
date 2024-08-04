
from fastapi import APIRouter, HTTPException, status, Depends
from models.stock import Stock
from util.current_user import current_user
from models.user import User
from decouple import config
import requests
from datetime import datetime, timedelta

router = APIRouter(prefix="/stocks", tags=["Stock"])
BASE_URL = 'https://financialmodelingprep.com/api/v3/'

# request from FMP API
# @router.get("/quote/{symbol}", response_description="stock details from api")
# def get_quote(symbol: str):
    
#     api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY"), config("FMP_THIRD_API_KEY"), config("FMP_FOURTH_API_KEY")]
#     for key in api_keys:
#         try:
#             endpoint = f'/quote/{symbol}?apikey={key}'
#             url = BASE_URL + endpoint
#             print('fetching data')
#             response = requests.get(url)
#             data1 = response.json()[0]

#             # Try first API key for company info request
#             companyInfoUrl = f'https://financialmodelingprep.com/api/v3/profile/{symbol}?apikey={key}'
#             companyInfoRes = requests.get(companyInfoUrl)
#             data2 = companyInfoRes.json()[0]

#             # Combine the two JSON objects
#             combined_data = {**data1, **data2}
#             return combined_data
#         except Exception as e:
#             print( {"error": str(e)})

@router.get("/historical_data/{symbol}", response_description="stock details from api")
def get_historical_data(symbol:str):
    # api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY"), config("FMP_THIRD_API_KEY"), config("FMP_FOURTH_API_KEY")]
    # for key in api_keys:
    count = 1
    api_key  = config(f"FMP_{count}_API_KEY")
    while api_key:
        try:
            endpoint = f'historical-price-full/{symbol}'
            url = f"{BASE_URL}{endpoint}?apikey={api_key}"
            response = requests.get(url)
            response.raise_for_status()  # Raises an HTTPError for bad responses
            historical_stock_price = response.json()
            return historical_stock_price  # Return the data if successful
        except requests.RequestException as e:
            print(f"Error with API key {api_key}: {str(e)}")
        count += 1
        api_key = config(f"FMP_{count}_API_KEY")
    # If all API keys fail
    return {"error": "Unable to fetch data with any of the provided API keys"}

@router.get("/intrady_chart/{symbol}")
def get_intrady_chart(symbol:str):
    # api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY"), config("FMP_THIRD_API_KEY")]
    # for key in api_keys:
    count = 1
    api_key  = config(f"FMP_{count}_API_KEY")
    while api_key:
        try:
            current_date = datetime.now()
            current_date_formatted = current_date.strftime("%Y-%m-%d")
            one_month_ago = current_date - timedelta(days=30)  # Approximation for a month
            # Format one month ago date as yyyy-mm-dd
            one_month_ago_formatted = one_month_ago.strftime("%Y-%m-%d")
            endpoint = f'historical-chart/15min/{symbol}?from={one_month_ago_formatted}&to={current_date_formatted}'
            print(endpoint)
            url = f"{BASE_URL}{endpoint}&apikey={api_key}"
            response = requests.get(url)
            response.raise_for_status()  # Raises an HTTPError for bad responses
            monthly_intrady_data = response.json()
            return monthly_intrady_data
        except requests.RequestException as e:
            print(f"Error with API key {api_key}: {str(e)}")
        count += 1
        api_key = config(f"FMP_{count}_API_KEY")
     # If all API keys fail
    return {"error": "Unable to fetch data with any of the provided API keys"}

@router.get("/quote/{symbol}")
def get_stock_quote(symbol:str):
    
    # api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY"), config("FMP_THIRD_API_KEY"), config("FMP_FOURTH_API_KEY")]
    count = 1
    api_key  = config(f"FMP_{count}_API_KEY")
    while api_key:
        try:
            endpoint = f'quote/{symbol}'
            url = f"{BASE_URL}{endpoint}?apikey={api_key}"
            response = requests.get(url)
            response.raise_for_status()  # Raises an HTTPError for bad responses
            stock_quote = response.json()[0]
            return stock_quote
        except requests.RequestException as e:
            print(f"Error with API key {api_key}: {str(e)}")
        count += 1
        api_key = config(f"FMP_{count}_API_KEY")
    # for key in api_keys:
    #     try:
    #         endpoint = f'quote/{symbol}'
    #         url = f"{BASE_URL}{endpoint}?apikey={key}"
    #         response = requests.get(url)
    #         response.raise_for_status()  # Raises an HTTPError for bad responses
    #         stock_quote = response.json()[0]
    #         return stock_quote
    #     except requests.RequestException as e:
    #         print(f"Error with API key {key}: {str(e)}")
    # If all API keys fail
    return {"error": "Unable to fetch data with any of the provided API keys"}

    
        
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

# @router.get("/historicalPrice/{ticker}")
# async def get_historicalPrice(ticker: str, user: User =Depends(current_user)):
#     # api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY")]
#     # for key in api_keys:
#     count = 1
#     api_key  = config(f"FMP_{count}_API_KEY")
#     while api_key:
#         try:
#             endpoint = f'/historical-price-full/{ticker}?apikey={api_key}'
#             url = BASE_URL + endpoint
#             response = requests.get(url)
#         except Exception as e:
#             return {"error": str(e)}
#         count += 1
#         api_key = config(f"FMP_{count}_API_KEY")

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
    # api_keys = [ config("FMP_FIRST_API_KEY"), config("FMP_SECOND_API_KEY")]
    price = None
    # for key in api_keys:
    count = 1
    api_key  = config(f"FMP_{count}_API_KEY")
    while api_key:
        try:
            url = f"https://financialmodelingprep.com/api/v3/quote-short/{ticker}?apikey={api_key}"
            response = requests.get(url).json()
            price = response[0]['price']
            break  # Exit the loop once you get the price
        except Exception as e:
            print(f"Error with API key {api_key}: {str(e)}")  # Print the error and continue with the next key
        count += 1
        api_key = config(f"FMP_{count}_API_KEY")
        
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