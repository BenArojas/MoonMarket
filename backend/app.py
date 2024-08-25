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

DESCRIPTION = """
This API powers whatever I want to make

It supports:

- Account sign-up and management
- Something really cool that will blow your socks off
"""

# async def init_db(client: AsyncIOMotorClient):
#     db = client.stock_db
#     await init_beanie(database=db, document_models=[User, Stock, Transaction, PortfolioSnapshot, FriendRequest])

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application services."""
    client = None
    try:
        client = AsyncIOMotorClient(CONFIG.DB_URL, maxPoolSize=50, minPoolSize=10)
        await init_beanie(database=client[CONFIG.DB_NAME], document_models=[User, Stock, Transaction, PortfolioSnapshot, FriendRequest])
        print("Database initialized")
        
        yield
    finally:
        await asyncio.sleep(1)  # Allow pending operations to complete
        if client:
            client.close()
            print("Database connection closed")

app = FastAPI(
    title="My Server",
    description=DESCRIPTION,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Consider restricting this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)