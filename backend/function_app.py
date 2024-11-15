import azure.functions as func
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from datetime import datetime, timezone
import requests
from models.stock import Stock
from models.APIKeyManager import ApiKey
from utils.api_key import get_api_key
from config import CONFIG

app = func.FunctionApp()

async def init_db():
    client = AsyncIOMotorClient(CONFIG.DB_URL, maxPoolSize=50, minPoolSize=10)
    await init_beanie(
        database=client[CONFIG.DB_NAME],
        document_models=[Stock, ApiKey]
    )
    return client

@app.function_name(name="StockUpdateTimer")
@app.schedule(schedule="0 15 21 * * 1-5", arg_name="market_close")  # 21:15 UTC = 4:15 PM ET
@app.schedule(schedule="0 0 17 * * 1-5", arg_name="market_midday")  # 17:00 UTC = 12:00 PM ET
async def stock_update_timer(timer: func.TimerRequest) -> None:
    logging.info(f"Starting stock update function at {datetime.now()}")
    client = None
    
    try:
        client = await init_db()
        api_key = await get_api_key()
        all_stocks = await Stock.find_all().to_list()
        successful_updates = 0
        failed_tickers = []
        
        for stock in all_stocks:
            try:
                url = f"https://financialmodelingprep.com/api/v3/quote-short/{stock.ticker}?apikey={api_key.key}"
                response = requests.get(url).json()
                price = response[0]['price']
                
                await stock.set({
                    Stock.price: price,
                    Stock.last_updated: datetime.now(timezone.utc)
                })
                successful_updates += 1
                logging.info(f"Updated {stock.ticker} price to {price}")
                await api_key.increment_usage()
                
            except Exception as e:
                logging.error(f"Failed to update {stock.ticker}: {str(e)}")
                failed_tickers.append(stock.ticker)
                continue
                
        logging.info(f"""
            Update completed:
            Total stocks: {len(all_stocks)}
            Successful: {successful_updates}
            Failed: {len(failed_tickers)}
            Failed tickers: {', '.join(failed_tickers)}
        """)
        
    except Exception as e:
        logging.error(f"Error in stock update: {str(e)}")
    finally:
        if client:
            client.close()