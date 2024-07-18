
"""Server app config."""

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


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore
    """Initialize application services."""
    app.db = AsyncIOMotorClient(CONFIG.DB_URL).stock_db  # type: ignore[attr-defined]
    await init_beanie(app.db, document_models=[User, Stock,FriendRequest, Transaction, PortfolioSnapshot])  # type: ignore[arg-type,attr-defined]
    print("Startup complete")
    yield
    print("Shutdown complete")


app = FastAPI(
    title="My Server",
    description=DESCRIPTION,
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)