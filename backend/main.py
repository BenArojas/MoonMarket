import asyncio
import json
import logging
import ssl
import time
import websockets.asyncio.server
import threading

from fastapi import Depends, FastAPI
import websocket
import uvicorn
from contextlib import asynccontextmanager
from starlette.middleware.cors import CORSMiddleware
import httpx
from app import AppState, state, get_app_state
from ibkr_stocks import fetch_holdings, router as StocksRouter
from ibkr_auth import check_authentication, router as AuthRouter


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


async def keep_session_alive():
    """Keep IBKR session alive with /tickle endpoint."""
    while True:
        await asyncio.sleep(60)
        try:
            response = await state.client.post(f"{state.config['ibkr_api_url']}/tickle", timeout=5)
            if response.status_code == 200:
                logger.info("Session tickled successfully")
                # Update session token for WebSocket if needed
                session_data = await response.json()
                if "session" in session_data:
                    state.ibkr_session_token = session_data["session"]
            else:
                logger.error(f"Session tickle failed: {response.status_code} - {response.text}")
        except httpx.RequestError as e:
            logger.error(f"Error tickling session: {e}")

async def fetch_account_summary(state: AppState):
    """Fetch account summary data from IBKR API."""
    if not state.account_id:
        logger.warning("No account ID set, skipping fetch_account_summary.")
        return
    
    try:
        response = await state.client.get(
            f"{state.config['ibkr_api_url']}/portfolio/{state.account_id}/summary", 
            timeout=5
        )
        response.raise_for_status()
        summary_data = response.json()  # Synchronous call for httpx
        
        # Log the raw response for debugging
        # logger.debug(f"Raw summary data: {summary_data}")
        
        # Initialize account summary
        state.account_summary = {
            "account_id": state.account_id,
            "total_cash": 0,
            "net_liquidation": 0,
            "buying_power": 0,
            "currency": "USD"
        }
        
        # Check if summary_data is a dictionary
        if not isinstance(summary_data, dict):
            logger.error(f"Unexpected summary_data format: expected dict, got {type(summary_data)}")
            return

        # Parse summary data
        for key, data in summary_data.items():
            if not isinstance(data, dict):
                logger.warning(f"Skipping invalid data for key {key}: {data}")
                continue
            # Use 'amount' for numeric values, fall back to 'value' for strings
            value = data.get("amount", data.get("value", 0))
            
            if key.lower() == "totalcashvalue":
                state.account_summary["total_cash"] = float(value) if value else 0
            elif key.lower() == "netliquidation":
                state.account_summary["net_liquidation"] = float(value) if value else 0
            elif key.lower() == "buyingpower":
                state.account_summary["buying_power"] = float(value) if value else 0
            elif key.lower() == "currency":
                state.account_summary["currency"] = value if value else "USD"
        
        logger.info(f"Account summary updated: {state.account_summary}")
        
        # Broadcast to clients
        await broadcast_to_clients({
            "type": "account_summary",
            "data": state.account_summary
        })
        
    except httpx.RequestError as e:
        logger.error(f"Error fetching account summary: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in fetch_account_summary: {e}")
        logger.debug(f"Response content: {response.text if 'response' in locals() else 'N/A'}")
        raise  # Re-raise for debugging

async def broadcast_to_clients(message):
    """Broadcast a message to all connected WebSocket clients."""
    if not state.clients:
        return
    
    message_str = json.dumps(message)
    tasks = [client.send(message_str) for client in state.clients.copy()]
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        logger.error(f"Error broadcasting to clients: {e}")

def on_ibkr_message(ws, message):
    """Handle messages from IBKR WebSocket."""
    try:
        # Parse the message - IBKR sends different formats
        if isinstance(message, str):
            if message.startswith('smd+'):
                # Market data message
                asyncio.create_task(handle_market_data_message(message))
            elif message.startswith('ssd+'):
                # Account summary message
                asyncio.create_task(handle_account_summary_message(message))
            else:
                logger.info(f"Received IBKR message: {message}")
        else:
            logger.info(f"Received non-string IBKR message: {message}")
    except Exception as e:
        logger.error(f"Error handling IBKR message: {e}")

async def handle_market_data_message(message):
    """Handle market data messages from IBKR WebSocket."""
    try:
        # Parse market data message format: smd+conid+{"field":"value"}
        parts = message.split('+', 2)
        if len(parts) >= 3:
            conid = parts[1]
            data_str = parts[2]
            data = json.loads(data_str)
            
            # Find the symbol for this conid
            symbol = None
            for sym, holding in state.holdings.items():
                if holding["conid"] == conid:
                    symbol = sym
                    break
            
            if symbol and "31" in data:  # Field 31 is last price
                price = float(data["31"])
                holding = state.holdings[symbol]
                
                # Calculate values
                current_value = price * holding["quantity"]
                unrealized_pnl = (price - holding["avg_bought_price"]) * holding["quantity"]
                
                market_data_message = {
                    "type": "market_data",
                    "symbol": symbol,
                    "last_price": price,
                    "avg_bought_price": holding["avg_bought_price"],
                    "quantity": holding["quantity"],
                    "value": current_value,
                    "unrealized_pnl": unrealized_pnl,
                }
                
                await broadcast_to_clients(market_data_message)
                
    except Exception as e:
        logger.error(f"Error handling market data message: {e}")

async def handle_account_summary_message(message):
    """Handle account summary messages from IBKR WebSocket."""
    try:
        # Parse account summary message
        parts = message.split('+', 2)
        if len(parts) >= 3:
            data_str = parts[2]
            data = json.loads(data_str)
            
            # Update account summary with new data
            if "result" in data:
                for item in data["result"]:
                    key = item.get("key", "")
                    monetary_value = item.get("monetaryValue")
                    currency = item.get("currency", "USD")
                    
                    if "TotalCashValue" in key and monetary_value:
                        state.account_summary["total_cash"] = float(monetary_value)
                    elif "NetLiquidation" in key and monetary_value:
                        state.account_summary["net_liquidation"] = float(monetary_value)
                    elif "BuyingPower" in key and monetary_value:
                        state.account_summary["buying_power"] = float(monetary_value)
                
                # Broadcast updated account summary
                await broadcast_to_clients({
                    "type": "account_summary",
                    "data": state.account_summary
                })
                
    except Exception as e:
        logger.error(f"Error handling account summary message: {e}")

async def on_ibkr_error(ws, error):
    logger.error(f"IBKR WebSocket error: {error}")
    # Broadcast error to frontend
    await broadcast_to_clients({
        "type": "error",
        "message": str(error)
    })

def on_ibkr_close(ws, close_status_code, close_msg):
    """Handle IBKR WebSocket close."""
    logger.info(f"IBKR WebSocket closed: {close_status_code} - {close_msg}")

def on_ibkr_open(ws, state: AppState):
    """Handle IBKR WebSocket open."""
    logger.info("IBKR WebSocket connection opened")
    
    # Subscribe to account summary if we have account ID
    if state.account_id:
        summary_subscription = f'ssd+{state.account_id}+{{"keys":["AccruedCash-S","ExcessLiquidity-S","NetLiquidation-S","TotalCashValue-S","BuyingPower-S"],"fields":["currency","monetaryValue"]}}'
        ws.send(summary_subscription)
        logger.info(f"Subscribed to account summary: {summary_subscription}")
    
    # Subscribe to market data for existing holdings
    for symbol, holding in state.holdings.items():
        conid = holding["conid"]
        if conid not in state.subscribed_conids:
            market_data_subscription = f'smd+{conid}+{{"fields":["31","84","86"]}}'  # last price, bid, ask
            ws.send(market_data_subscription)
            state.subscribed_conids.add(conid)
            logger.info(f"Subscribed to market data for {symbol} (conid: {conid})")

def run_ibkr_websocket_sync(state):
    """
    The target function for the WebSocket thread. This is a SYNCHRONOUS function.
    """
    # Create an SSL context that disables certificate verification
    ssl_context = ssl._create_unverified_context()  # Bypasses SSL verification
    reconnect_wait = 5  # Start with 5 seconds
    while True:
        try:
            session_token = None
            # Use a temporary SYNCHRONOUS client for this thread-local call
            with httpx.Client(verify=False) as client:
                response = client.post(f"{state.config['ibkr_api_url']}/tickle", timeout=10)
                if response.status_code == 200:
                    session_data = response.json()
                    session_token = session_data.get("session")
                    if session_token:
                         state.ibkr_session_token = session_token
                         logger.info(f"Got session token for WebSocket: {session_token[:8]}...")
                else:
                    logger.error(f"Failed to get session token: {response.status_code}")

            if session_token:
                cookie = f'api={{"session":"{session_token}"}}'
                # Create and run the WebSocketApp
                state.ibkr_ws = websocket.WebSocketApp(
                    state.config["ibkr_ws_url"],
                    on_open=lambda ws: on_ibkr_open(ws, state),
                    on_message=on_ibkr_message,
                    on_error=on_ibkr_error,
                    on_close=on_ibkr_close,
                    cookie=cookie
                )
                # Run WebSocket with unverified SSL context
                state.ibkr_ws.run_forever(sslopt={"context": ssl_context})

        except Exception as e:
            logger.error(f"Error in IBKR WebSocket thread: {e}")
        
        finally:
            # This block runs when run_forever() exits (e.g., on connection close)
            logger.warning(f"IBKR WebSocket disconnected. Reconnecting in {reconnect_wait} seconds...")
            time.sleep(reconnect_wait)  # Safe in sync thread
            reconnect_wait = min(reconnect_wait * 2, 60)  # Exponential backoff, max 60s
            reconnect_wait = 5  # Reset after successful connection

async def start_ibkr_websocket():
    """Start the IBKR WebSocket connection in a separate thread."""
    # The target must be a regular 'def' function
    websocket_thread = threading.Thread(target=run_ibkr_websocket_sync, args=(state,), daemon=True)
    websocket_thread.start()
    logger.info("IBKR WebSocket thread started.")


async def handle_client(websocket: websockets.asyncio.server.ServerConnection):
    """Handle WebSocket connections from frontend clients."""
    logger.info(f"New client connected: {websocket.remote_address}")
    state.clients.add(websocket)
    
    # Send initial data to new client
    try:
        if state.account_summary:
            await websocket.send(json.dumps({
                "type": "account_summary",
                "data": state.account_summary
            }))
        
        # Send current holdings data
        for symbol, holding in state.holdings.items():
            await websocket.send(json.dumps({
                "type": "holding_info",
                "symbol": symbol,
                "data": holding
            }))
    except Exception as e:
        logger.error(f"Error sending initial data to client: {e}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Received message from client: {data}")
                
                # Handle different client message types
                if data.get("type") == "request_refresh":
                    # Trigger a refresh of holdings and account data
                    await fetch_holdings()
                    await fetch_account_summary()
                
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

    # Authentication check
    if not await check_authentication(state):
        logger.error("Authentication required. Please log in to IBKR Client Portal.")
        # Optionally raise an exception to abort app startup
        raise RuntimeError("Authentication failed.")

    # Initial data fetch
    await fetch_holdings(state)
    await fetch_account_summary(state)
    
    # Start background tasks
    state.session_keeper_task = asyncio.create_task(keep_session_alive())
    
    # Start IBKR WebSocket connection
    await start_ibkr_websocket()
    
    # Start our WebSocket server for clients
    websocket_server = await websockets.serve(handle_client, "localhost", state.config["websocket_port"])
    logger.info(f"Client WebSocket server started on ws://localhost:{state.config['websocket_port']}")
    
    yield
    
    # --- Shutdown logic ---
    logger.info("Server shutting down...")

    if state.ibkr_ws:
        state.ibkr_ws.close()

    websocket_server.close()
    await websocket_server.wait_closed()

    if state.session_keeper_task:
        state.session_keeper_task.cancel()
        await asyncio.gather(state.session_keeper_task, return_exceptions=True)

    logger.info("All background tasks cancelled.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(AuthRouter, dependencies=[Depends(get_app_state)])
app.include_router(StocksRouter, dependencies=[Depends(get_app_state)])

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=state.config["http_port"])