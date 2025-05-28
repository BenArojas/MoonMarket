import json
import logging
from typing import Dict, Set
import httpx
import websockets.asyncio.server
import urllib3

# Suppress SSL warnings for self-signed certificate
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class AppState:
    def __init__(self):
        self.clients: Set[websockets.asyncio.server.ServerConnection] = set()
        self.holdings: Dict[str, Dict] = {}
        self.account_summary: Dict[str, any] = {}
        self.account_id: str = None
        self.client = httpx.AsyncClient(verify=False)
        self.config = self.load_config()

        self.session_keeper_task = None
        self.ibkr_websocket_task = None
        self.ibkr_ws = None
        self.ibkr_session_token = None
        self.subscribed_conids: Set[str] = set()

    def load_config(self):
        try:
            with open('config.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            config = {
                "ibkr_api_url": "https://localhost:5000/v1/api",
                "ibkr_ws_url": "wss://localhost:5000/v1/api/ws",
                "websocket_port": 8765,
                "http_port": 8000
            }
            with open('config.json', 'w') as f:
                json.dump(config, f, indent=4)
            logger.info("Created default config.json")
            return config

state = AppState()

async def get_app_state() -> AppState:
    return state
