# app_state.py
import asyncio
from typing import Dict, Optional, Set
from websockets.server import ServerProtocol
 # For frontend client typing
from models import PositionData, AccountSummaryData

class AppState:
    def __init__(self):
        self.ibkr_session_token: Optional[str] = None
        self.ibkr_account_id: Optional[str] = None
        self.current_positions: Dict[str, PositionData] = {} # Keyed by str(conid)
        self.account_summary: Optional[AccountSummaryData] = None
        self.ibkr_authenticated: bool = False
        self.ibkr_websocket_connected: bool = False

        # For managing frontend WebSocket clients
        self.frontend_clients: Set[ServerProtocol] = set()
        self._lock = asyncio.Lock() # To protect concurrent access to frontend_clients if needed

    async def add_frontend_client(self, websocket: ServerProtocol):
        async with self._lock:
            self.frontend_clients.add(websocket)

    async def remove_frontend_client(self, websocket: ServerProtocol):
        async with self._lock:
            self.frontend_clients.discard(websocket)

    def get_position(self, conid: str) -> Optional[PositionData]:
        return self.current_positions.get(conid)

    def update_or_create_position(self, conid: str, data: PositionData):
        self.current_positions[conid] = data

    def update_account_summary(self, summary_data: AccountSummaryData):
        self.account_summary = summary_data