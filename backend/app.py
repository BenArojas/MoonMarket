"""Server app config."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from config import CONFIG
from models.user import User
from models.stock import Stock
from models.transaction import Transaction
from models.PortfolioSnapshot import PortfolioSnapshot
from models.friendRequest import FriendRequest
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from models.APIKeyManager import ApiKey
import logging
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, timezone
import requests
from util.api_key import get_api_key
from pytz import timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore

DESCRIPTION = """
This API powers whatever I want to make

It supports:

- Account sign-up and management
- Something really cool that will blow your socks off
"""

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



async def daily_stock_update():
    """
    Updates all stock prices in the database. Runs daily at noon.
    """
    logger.info(f"Starting daily stock update at {datetime.now()}")
    
    try:
        api_key = await get_api_key()
        all_stocks = await Stock.find_all().to_list()
        successful_updates = 0
        failed_tickers = []
        
        for stock in all_stocks:
            try:
                # Get updated price from API
                url = f"https://financialmodelingprep.com/api/v3/quote-short/{stock.ticker}?apikey={api_key.key}"
                response = requests.get(url).json()
                price = response[0]['price']
                
                # Update stock price in database
                await stock.set({
                        Stock.price: price,
                        Stock.last_updated: datetime.now(timezone.utc)
                    })
                successful_updates += 1
                logger.info(f"Successfully updated {stock.ticker} price to {price}")
                await api_key.increment_usage()
                
            except Exception as e:
                error_msg = f"Failed to update {stock.ticker}: {str(e)}"
                logger.error(error_msg)
                failed_tickers.append(stock.ticker)
                continue
        
        # Log summary
        total_stocks = len(all_stocks)
        logger.info(f"""
            Daily update completed:
            Total stocks: {total_stocks}
            Successful updates: {successful_updates}
            Failed updates: {len(failed_tickers)}
            Failed tickers: {', '.join(failed_tickers)}
        """)
        
    except Exception as e:
        logger.error(f"Error in daily stock update: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application services."""
    client = None
    try:
        # Initialize MongoDB client
        client = AsyncIOMotorClient(CONFIG.DB_URL, maxPoolSize=50, minPoolSize=10)
        
        # Initialize Beanie
        await init_beanie(
            database=client[CONFIG.DB_NAME], 
            document_models=[User, Stock, Transaction, PortfolioSnapshot, FriendRequest, ApiKey]
        )
        logger.info("Database initialized")
        yield
    finally:
        
        # Close database connection
        await asyncio.sleep(1)  # Allow pending operations to complete
        if client:
            client.close()
            logger.info("Database connection closed")
            
# Create the main app that combines both API and static file serving
app = FastAPI(lifespan=lifespan)

#when developing comment these:
# Create the API app
# api_app = FastAPI(
#     title="My Server API",
#     description=DESCRIPTION,
#     version="0.1.0",
# )

# # Mount the API app
# app.mount("/api", api_app)

# # Mount the static files directly to the root
# app.mount("/", StaticFiles(directory="static", html=True), name="static")

# @app.exception_handler(404)
# async def custom_404_handler(request, exc):
#     return FileResponse('static/index.html')


# Add CORS middleware to the main app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:5173"],  # Add both your main app and any dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional: Endpoint to manually trigger the update
@app.post("/trigger_stock_update")
async def trigger_stock_update():
    """Manually trigger the stock update process."""
    await daily_stock_update()
    return {"message": "Manual stock update completed"}

