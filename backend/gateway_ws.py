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

async def _initial_snapshot(ws: WebSocket, svc: IBKRService) -> None:
    # 1️⃣  account summary (if you want)
    if svc.state.account_summary is not None:
        await ws.send_text(json.dumps({
            "type": "account_summary",
            "data": svc.state.account_summary.model_dump()
        }))

    # 2️⃣  all open positions
    for p in svc.state.positions:
        await ws.send_text(
            FrontendMarketDataUpdate
            .from_position_row(p)
            .model_dump_json()
        )
    
    # 3️⃣  account-wide P&L snapshot (NEW)
    # The `svc.state.pnl` is populated by _prime_caches and is already
    # in the dictionary format the frontend expects for the 'data' field.
    if svc.state.pnl:
        await ws.send_text(json.dumps({
            "type": "pnl",
            "data": svc.state.pnl
        }))

    # You could continue to send other initial state here, like
    # allocation, ledger, watchlists, etc. following the same pattern.
    # For example:
    # if svc.state.allocation:
    #     await ws.send(json.dumps({
    #         "type": "allocation",
    #         "data": svc.state.allocation
    #     }))



# ---------- WebSocket endpoint ----------
@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    """
    • Accept FE socket
    • Push one snapshot
    • Then just keep it open (you can add ping-pong etc. later)
    """
    app       = ws.scope["app"]          # <-- grab FastAPI instance
    svc: "IBKRService" = app.state.ibkr  # type: ignore
    await ws.accept()
    _clients.add(ws)
    log.info("FE socket joined (%d total)", len(_clients))

    await _initial_snapshot(ws, svc)     # send the portfolio once

    try:
        while True:
            await ws.receive_text()      # ignore inbound messages for now
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
        log.info("FE socket left  (%d total)", len(_clients))
