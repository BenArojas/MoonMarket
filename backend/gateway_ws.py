# gateway_ws.py
"""
FastAPI-native WebSocket broadcaster.
The single public symbol ``broadcast`` is injected into IBKRService.
"""
import logging, json
from typing import Any, Set
from utils import clean_nan_values

from ibkr_service import IBKRService
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models import WebSocketRequest
log = logging.getLogger(__name__)
router = APIRouter()
_clients: Set[WebSocket] = set()

# ---------- helper wired from IBKRService ----------
async def broadcast(payload: dict[str, Any]) -> None:
    """
    Cleans, serializes, and broadcasts a dictionary payload to all connected clients.
    """
    if not isinstance(payload, dict):
        log.error(f"Broadcast function received non-dict payload: {type(payload)}")
        return

    # 1. Clean the dictionary to remove any NaN values
    cleaned_payload = clean_nan_values(payload)
    
    # 2. Convert the clean dictionary to a JSON string
    json_string = json.dumps(cleaned_payload)

    # 3. Send the valid JSON string to all clients
    dead: list[WebSocket] = []
    for ws in _clients:
        try:
            await ws.send_text(json_string)
        except WebSocketDisconnect:
            dead.append(ws)
        except RuntimeError:
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