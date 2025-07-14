# gateway_ws.py
"""
FastAPI-native WebSocket broadcaster.
The single public symbol ``broadcast`` is injected into IBKRService.
"""
import asyncio, logging, json
from typing import Set, Callable, Awaitable
from models import FrontendMarketDataUpdate
from ibkr_service import IBKRService
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect

log = logging.getLogger(__name__)
router = APIRouter()
_clients: Set[WebSocket] = set()

# ---------- helper wired from IBKRService ----------
async def broadcast(msg: str) -> None:
    dead: list[WebSocket] = []
    for ws in _clients:
        try:
            await ws.send_text(msg)
        except WebSocketDisconnect:
            dead.append(ws)
        except RuntimeError:
            # "Unexpected ASGI message 'websocket.send'": socket was already closed
            dead.append(ws)

    for ws in dead:
        _clients.discard(ws)    

# ---------- WebSocket endpoint ----------
@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    """
    Accepts a WebSocket connection from the frontend and adds it to the
    pool of clients to receive real-time broadcast updates.
    """
    app = ws.scope["app"]
    svc: "IBKRService" = app.state.ibkr  # type: ignore
    await ws.accept()
    _clients.add(ws)
    log.info("FE socket joined (%d total)", len(_clients))

    # REMOVED: await _initial_snapshot(ws, svc)

    try:
        # Keep the connection alive to receive broadcasts.
        # The client does not need to send any messages.
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
        log.info("FE socket left  (%d total)", len(_clients))