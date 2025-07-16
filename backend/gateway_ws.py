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
from models import WebSocketRequest
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
async def ws_endpoint(ws: WebSocket, accountId: str):
    """
    Accepts a WebSocket connection from the frontend and adds it to the
    pool of clients to receive real-time broadcast updates.
    """
    app = ws.scope["app"]
    svc: "IBKRService" = app.state.ibkr  # type: ignore
    await svc.initialize_websocket_task(accountId)
    
    await ws.accept()
    _clients.add(ws)
    log.info(f"Frontend client connected for account {accountId} ({len(_clients)} total)")

    try:
        while True:
            data = await ws.receive_text()
            try:
                command = WebSocketRequest.parse_raw(data)
                # Add the accountId to the command if not present
                if not command.account_id:
                    command.account_id = accountId
                await svc.handle_ws_command(command)
            except Exception as e:
                log.error(f"Failed to process WS command: {data}, error: {e}")
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
        log.info("FE socket left  (%d total)", len(_clients))