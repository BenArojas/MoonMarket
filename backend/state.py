# state.py

import asyncio
from typing import Optional, List, Dict, Any, Set
from pydantic import BaseModel, Field
from websockets.legacy.client import WebSocketClientProtocol

class IBKRState(BaseModel):
    shutdown_signal: asyncio.Event = Field(default_factory=asyncio.Event)
    ibkr_websocket_session: Optional[WebSocketClientProtocol] = None
    ibkr_authenticated: bool = False
    ibkr_session_token: Optional[str] = None
    ws_connected: bool = False
    positions: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    accounts_fetched: bool = False
    accounts_cache: List[Dict[str, Any]] = Field(default_factory=list)
    allocation: Dict[str, Optional[dict]] = Field(default_factory=dict)
    active_stock_conid: Optional[int] = None
    chart_subscriptions: Dict[int, str] = Field(default_factory=dict)  # Key: conid, Value: serverId
    pnl_subscribed: bool = False
    portfolio_subscriptions: Set[int] = Field(default_factory=set)
    
    class Config:
        arbitrary_types_allowed = True