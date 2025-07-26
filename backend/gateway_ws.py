# gateway_ws.py
"""
FastAPI-native WebSocket broadcaster.
The single public symbol ``broadcast`` is injected into IBKRService.
"""
import asyncio
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
    app = ws.scope["app"]
    svc: "IBKRService" = app.state.ibkr
    await svc.initialize_websocket_task(accountId)
    
    # 1. Wait for the backend to be ready BEFORE accepting the client.
    try:
        await asyncio.wait_for(svc.wait_for_connection(), timeout=10.0)
    except asyncio.TimeoutError:
        log.error("Timed out waiting for IBKR WebSocket to connect.")
        return # Exit without accepting
        
    # 2. NOW, accept the client connection.
    await ws.accept()
    
    _clients.add(ws)
    log.info(f"Frontend client connected for account {accountId} ({len(_clients)} total)")

    # 3. Send initial data
    if svc.state.ibkr_websocket_session and not svc.state.pnl_subscribed:
        log.info(f"Subscribing to PnL for account {accountId}")
        await svc.state.ibkr_websocket_session.send(f'spl+{accountId}')
        svc.state.pnl_subscribed = True

    await svc._send_initial_allocation(accountId)

    # 4. Listen for commands
    try:
        while True:
            data = await ws.receive_text()
            try:
                command = WebSocketRequest.model_validate_json(data)
                if not command.account_id:
                    command.account_id = accountId
                await svc.handle_ws_command(command)
            except Exception as e:
                log.error(f"Failed to process WS command: {data}, error: {e}")
                
    except (WebSocketDisconnect, RuntimeError):
        pass # Clean disconnect
    finally:
        _clients.discard(ws)
        log.info(f"FE socket left ({len(_clients)} total)")