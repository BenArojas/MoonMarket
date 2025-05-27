import asyncio
import json
import logging
import websockets.asyncio.server
from typing import Dict, Set
import requests
import urllib3
from fastapi import FastAPI
import uvicorn
from contextlib import asynccontextmanager
from starlette.middleware.cors import CORSMiddleware

from ibkr_stocks import fetch_holdings, fetch_market_data, router as StocksRouter
from ibkr_auth import check_authentication, router as AuthRouter


# Suppress SSL warnings for self-signed certificate
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging to console and file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Global State ---
# It's better to manage state in a more structured way, especially for a web server
class AppState:
    def __init__(self):
        self.clients: Set[websockets.asyncio.server.ServerConnection] = set()
        self.holdings: Dict[str, Dict] = {}
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verification
        self.config = self.load_config()
        self.http_server_task = None
        self.websocket_server_task = None
        self.market_data_task = None
        self.session_keeper_task = None

    def load_config(self):
        try:
            with open('config.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            config = {
                "ibkr_api_url": "https://localhost:5000/v1/api",
                "websocket_port": 8765,
                "http_port": 8000
            }
            with open('config.json', 'w') as f:
                json.dump(config, f, indent=4)
            logger.info("Created default config.json")
            return config

state = AppState()
config = state.config


async def keep_session_alive():
    """Keep IBKR session alive with /tickle endpoint."""
    while True:
        await asyncio.sleep(60)
        try:
            response = state.session.post(f"{config['ibkr_api_url']}/tickle", timeout=5)
            if response.status_code == 200:
                 logger.info("Session tickled successfully")
            else:
                logger.error(f"Session tickle failed: {response.status_code} - {response.text}")
        except requests.RequestException as e:
            logger.error(f"Error tickling session: {e}")


async def handle_client(websocket: websockets.asyncio.server.ServerConnection):
    """Handle WebSocket connections."""
    logger.info(f"New client connected: {websocket.remote_address}")
    state.clients.add(websocket)
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Received message: {data}")
                response = {"type": "echo", "data": data}
                await websocket.send(json.dumps(response))
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Client disconnected: {websocket.remote_address}, code: {e.code}, reason: {e.reason}")
    finally:
        state.clients.remove(websocket)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events for the server."""
    logger.info("Server starting up...")
    await fetch_holdings()
    
    # Start background tasks
    state.market_data_task = asyncio.create_task(fetch_market_data())
    state.session_keeper_task = asyncio.create_task(keep_session_alive())
    
    # Start WebSocket server
    websocket_server = await websockets.serve(handle_client, "localhost", config["websocket_port"])
    logger.info(f"WebSocket server started on ws://localhost:{config['websocket_port']}")
    
    yield
    
    # --- Shutdown logic ---
    logger.info("Server shutting down...")
    websocket_server.close()
    await websocket_server.wait_closed()
    
    # Cancel all background tasks
    state.market_data_task.cancel()
    state.session_keeper_task.cancel()
    await asyncio.gather(state.market_data_task, state.session_keeper_task, return_exceptions=True)
    logger.info("All background tasks cancelled.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(AuthRouter)
app.include_router(StocksRouter)

if __name__ == "__main__":
    if not check_authentication():
        logger.error("Authentication required. Please log in to IBKR Client Portal.")
        # We can still start the server to allow checking the /auth/status endpoint
    try:
        uvicorn.run(app, host="localhost", port=config["http_port"])
    except Exception as e:
        logger.critical(f"Failed to start Uvicorn server: {e}")