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
from models.APIKeyManager import ApiKey
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from decouple import config


DESCRIPTION = """
This API powers whatever I want to make

It supports:

- Account sign-up and management
- Something really cool that will blow your socks off
"""

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
            document_models=[User, Stock, Transaction, PortfolioSnapshot, FriendRequest, ApiKey ]
        )
        logger.info("Database initialized")
        logger.info(f"Starting application in {ENV_MODE} mode")
        yield
    finally:
        
        # Close database connection
        await asyncio.sleep(1)  # Allow pending operations to complete
        if client:
            client.close()
            logger.info("Database connection closed")

ENV_MODE = config("ENV_MODE")
# Create the main app that combines both API and static file serving
app = FastAPI(lifespan=lifespan)

if ENV_MODE == 'production':
    # Create the API app
    api_app = FastAPI(
        title="My Server API",
        description=DESCRIPTION,
        version="0.1.0",
    )

    # Mount the API app
    app.mount("/api", api_app)

    # Mount the static files directly to the root
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        return FileResponse('static/index.html')

if ENV_MODE == "development":
    @app.get("/")
    def read_root():
        return {"Hello": "World"}


origins = "http://localhost:8000" if ENV_MODE == "production" else "http://localhost:5173" 
# Add CORS middleware to the main app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

