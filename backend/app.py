"""Server app config."""

import asyncio
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from config import CONFIG
from models.user import User
from models.subscription import Subscription
from models.stock import Stock
from models.transaction import Transaction
from models.PortfolioSnapshot import PortfolioSnapshot
from models.friendRequest import FriendRequest
from models.APIKeyManager import ApiKey
import logging
from redis import asyncio as aioredis

DESCRIPTION = """
This API powers whatever I want to make

It supports:

- Account sign-up and management
- Something really cool that will blow your socks off
"""

# Configure logging at the start of the file
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Outputs logs to console (e.g., terminal or Docker logs)
    ],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_client = None
    redis_client = None
    try:
        # Initialize MongoDB client
        mongo_client = AsyncIOMotorClient(CONFIG.DB_URL, maxPoolSize=50, minPoolSize=10)
        
        # Initialize Redis client with retry logic
        for i in range(3):  # Try 3 times
            try:
                redis_client = await aioredis.from_url(
                CONFIG.REDIS_URL,
                decode_responses=True,
                socket_timeout=5
            )
                await redis_client.ping()  # Test connection
                break
            except Exception as e:
                if i == 2:  # Last attempt
                    logger.warning(f"Redis connection failed: {str(e)}")
                await asyncio.sleep(1)  # Wait before retry
        
        app.state.redis = redis_client
        
        # Initialize Beanie
        await init_beanie(
            database=mongo_client[CONFIG.DB_NAME], 
            document_models=[User, Stock, Transaction, PortfolioSnapshot, FriendRequest, ApiKey, Subscription]
        )
        logger.info("Database initialized")
        yield
    finally:
        if mongo_client:
            mongo_client.close()
        if redis_client:
            await redis_client.close()
        logger.info("Database and Redis connections closed")
        
# Get environment variables
origins = "http://localhost:5173" 
app = FastAPI(lifespan=lifespan)

app.add_middleware(
        CORSMiddleware,
        allow_origins=[origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/hello")
def read_root():
    return {"Hello": "World"}
