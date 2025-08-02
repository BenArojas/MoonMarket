# websocket/handler.py
import asyncio
import json
import logging
import math
import ssl
import time
import websockets
from models import (FrontendMarketDataUpdate, LedgerDTO, LedgerEntry,
                    LedgerUpdate, PnlRow, PnlUpdate, WebSocketRequest)
from utils import extract_price_from_snapshot, safe_float_conversion, parse_option_symbol
from config import GATEWAY_BASE_URL
from prot import ServiceProtocol

log = logging.getLogger("ibkr.ws")

class WebSocketHandlerMixin:
    # --- WebSocket Task Management ---
    async def initialize_websocket_task(self: ServiceProtocol, account_id: str):
        if self._ws_task and not self._ws_task.done():
            log.info("WebSocket task is already running.")
            return
        log.info(f"Initializing new WebSocket task for account: {account_id}")
        self._current_ws_account = account_id
        self._ws_task = asyncio.create_task(self._websocket_loop(account_id))
        
    async def shutdown_websocket_task(self: ServiceProtocol):
        """Signals the websocket loop to terminate and closes the connection."""
        if not self._ws_task or self._ws_task.done():
            log.info("WebSocket task not running, nothing to shut down.")
            return

        log.info("Shutting down IBKR WebSocket task...")
        self.state.shutdown_signal.set()

        # Gracefully close the active websocket session
        if self.state.ibkr_websocket_session:
            await self.state.ibkr_websocket_session.close(code=1000, reason='User logged out')

        try:
            # Wait for the task to finish its cleanup
            await asyncio.wait_for(self._ws_task, timeout=5.0)
        except asyncio.TimeoutError:
            log.warning("WebSocket task did not shut down gracefully, cancelling.")
            self._ws_task.cancel()
        except asyncio.CancelledError:
            pass # Task was already cancelled, which is fine
        finally:
            self._ws_task = None
            self._current_ws_account = None

        log.info("IBKR WebSocket task has been terminated.")

    # --- Command Handling ---
    async def handle_ws_command(self: ServiceProtocol, command: WebSocketRequest):
        """Processes commands by sending messages to the live IBKR WebSocket."""
        # Use self.state.ibkr_websocket_session consistently
        ws = self.state.ibkr_websocket_session 
        if not self.state.ws_connected or not ws:
            log.warning("Cannot handle command, IBKR WebSocket is not ready yet.")
            return

        action = command.action
        conid = command.conid
        account_id = command.account_id or self._current_ws_account

        if action == "subscribe_stock" and conid:
            log.info(f"Subscribing to market data for conid: {conid}")
            # Set the active stock conid BEFORE subscribing
            self.state.active_stock_conid = conid
            
            # Subscribe to Market Data (Quote: Last, Bid, Ask, etc.)
            smd_cmd = f'smd+{conid}+{{"fields":["31","84","86","82","83","70","71"]}}'
            await ws.send(smd_cmd)
            
            # Subscribe to Price Ladder (BookTrader/Depth)
            if account_id:
                sbd_cmd = f'sbd+{account_id}+{conid}'
                await ws.send(sbd_cmd)

        elif action == "unsubscribe_stock" and conid:
            log.info(f"Unsubscribing from market data for conid: {conid}")
            # Clear the active stock conid
            self.state.active_stock_conid = None
            await ws.send(f'umd+{conid}+{{}}')
            if account_id:
                await ws.send(f'ubd+{account_id}')
                
        elif action == "GET_INITIAL_ALLOCATION":
            await self._send_initial_allocation(account_id)
            
        elif action == "subscribe_portfolio" and account_id:
            log.info(f"Subscribing to portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            
            self.state.portfolio_subscriptions.update(conids)

            for cid in conids:
                cmd = f'smd+{cid}+{{"fields":["31","7635","83","82"]}}'
                await ws.send(cmd)
                await asyncio.sleep(0.05)

        elif action == "unsubscribe_portfolio" and account_id:
            log.info(f"Unsubscribing from portfolio for account: {account_id}")
            account_positions = await self.positions(account_id)
            conids = [str(p["conid"]) for p in account_positions]
            for cid in conids:
                self.state.portfolio_subscriptions.discard(cid)
                await ws.send(f'umd+{cid}+{{}}')
                await asyncio.sleep(0.05)
                
        else:
            log.warning(f"Unknown or incomplete WebSocket command received: {action}")

    # --- Message Dispatchers (Private) ---
    async def _dispatch_book_data(self: ServiceProtocol, msg: dict):
        """
        Parses BookTrader (price ladder) data and broadcasts it to the frontend.
        """
        try:
            # The raw data is a list of price level objects
            raw_book_data = msg.get("data", [])
            if not raw_book_data:
                return

            processed_book = []
            for level in raw_book_data:
                price_str = level.get("price")
                if not price_str:
                    continue

                # Price can sometimes be in "size @ price" format, so we handle that.
                if "@" in price_str:
                    parts = price_str.split(" @ ")
                    price = float(parts[1])
                else:
                    price = float(price_str)

                processed_level = {
                    "price": price,
                    "bidSize": int(level["bid"]) if level.get("bid") else None,
                    "askSize": int(level["ask"]) if level.get("ask") else None,
                }
                processed_book.append(processed_level)

            # Sort the book with the highest price (lowest ask) at the top
            processed_book.sort(key=lambda x: x["price"], reverse=True)

            # Broadcast the cleaned data to the frontend
            await self._broadcast({
                "type": "book_data", # A unique type for the frontend to identify it
                "data": processed_book
            })

        except (ValueError, KeyError) as e:
            log.error(f"Error parsing book data: {e} - Data: {msg}")
        
    async def _dispatch_ledger(self: ServiceProtocol, msg: dict):
        """
        Convert an 'sld' frame into a Frontend Ledger payload by parsing the 'result' list.
        """
        # 1. Get data from the 'result' key, not 'args'
        result_list = msg.get("result")
        if not isinstance(result_list, list):
            return

        # 2. Filter out partial updates and find the base currency
        # A full update will have the 'cashbalance' field.
        full_ledger_items = [item for item in result_list if 'cashbalance' in item]
        if not full_ledger_items:
            # This was a partial update with only timestamps, so we ignore it.
            return

        base_currency = "USD" # Default base currency
        base_entry = next((item for item in full_ledger_items if item.get("secondKey") == "BASE"), None)
        if base_entry:
            # If there's a BASE summary, we can determine the actual base currency
            # For simplicity, we'll assume USD if not found, but you could make this more robust.
            pass # Sticking with USD for now.

        # 3. Parse the valid ledger items using our Pydantic model
        try:
            parsed_ledgers = [LedgerEntry(**item) for item in full_ledger_items]
            
            # 4. Construct the final DTO that the frontend expects
            ledger_dto = LedgerDTO(
                baseCurrency=base_currency,
                ledgers=parsed_ledgers
            )
            
            # 5. Broadcast the correctly formatted update
            await self._broadcast(
                LedgerUpdate(data=ledger_dto).model_dump(by_alias=True) # Use by_alias to serialize correctly
            )
        except Exception as e:
            log.error(f"Failed to parse or dispatch ledger data: {e} - Data was: {full_ledger_items}")
        
    async def _dispatch_pnl(self: ServiceProtocol, msg: dict):
        """
        Convert an 'spl' frame (either list- or dict-style) into Frontend PnL payload.
        """
        args = msg.get("args")    # may be list OR dict

        rows: dict[str, PnlRow] = {}
        log.info(msg)

        if isinstance(args, dict):
            for k, v in args.items():
                if isinstance(v, dict):

                    if "dpl" in v: 
                        rows[k] = PnlRow(**v)

        elif isinstance(args, list):
            for v in args:
                if isinstance(v, dict):
                    # --- AND ADD THIS CHECK ---
                    if "dpl" in v:
                        key = v.get("key") or v.get("acctId")
                        if key:
                            rows[key] = PnlRow(**v)

        if rows:
            await self._broadcast(
                PnlUpdate(type="pnl", data=rows).model_dump()
            )
        
    async def _dispatch_chart_data(self: ServiceProtocol, msg: dict):
        """
        Parses a historical market data message ('smh') and broadcasts
        a formatted chart update to the frontend.
        """
        topic = msg.get("topic", "")
        if not topic:
            return

        try:
            # Extract the conid from the topic string, e.g., "smh+265598"
            conid = int(topic.split('+')[1])
            server_id = msg.get("serverId")
            chart_bars = msg.get("data", [])

            # When we get the first message, it includes the serverId.
            # We must store it so we can unsubscribe later.
            if conid and server_id:
                self.state.chart_subscriptions[conid] = server_id

            # Format the bar data into the structure our frontend chart expects
            formatted_bars = [
                {
                    "time": bar["t"] // 1000,
                    "open": bar["o"],
                    "high": bar["h"],
                    "low": bar["l"],
                    "close": bar["c"],
                    "volume": bar["v"],
                }
                for bar in chart_bars if "t" in bar # Ensure the bar is valid
            ]
            
            # Only broadcast if there's actual data to send
            if formatted_bars:
                await self._broadcast({
                    "type": "chart_update",
                    "conid": conid,
                    "data": formatted_bars
                })
        except (IndexError, ValueError) as e:
            log.error(f"Could not parse conid from chart data topic '{topic}': {e}")
        except Exception as e:
            log.error(f"Error dispatching chart data: {e}")
        
    async def _dispatch_tick(self: ServiceProtocol, msg: dict):
        account_id = self._current_ws_account
        if not account_id: return
        all_positions = self.state.positions.get(account_id)
        if all_positions is None:
            all_positions = await self.positions(account_id)
        conid_to_pos = {p["conid"]: p for p in all_positions}
        # 1. Get the price from the real-time message. If there's no price, ignore it.
        last_price = extract_price_from_snapshot(msg)
        if last_price is None:
            return

        # 2. Get the contract ID (conid) from the message
        cid = int(msg["topic"].split("+", 1)[1])

        # 3. Make sure we have the full position details for this conid
        if (pos := conid_to_pos.get(cid)):
            
            # 4. Now that we have the details, figure out the correct name
            asset_class = pos.get("assetClass", "STK")
            raw_description = pos.get("contractDesc") or str(cid)

            if asset_class == 'OPT':
                # If it's an option, parse it
                symbol_name = parse_option_symbol(raw_description)
            else:
                # Otherwise, just use the stock ticker
                symbol_name = raw_description

            # 5. Get the rest of the data
            qty = pos.get("position")
            cost = pos.get("avgPrice")
            daily_change_pct = safe_float_conversion(msg.get("83"))
            change_amount = safe_float_conversion(msg.get("82"))
            multiplier = 100 if asset_class == "OPT" else 1
            
            # 6. Build the final update object with the correct name
            update = FrontendMarketDataUpdate(
                conid=cid,
                symbol=symbol_name,
                last_price=last_price,
                quantity=qty,
                avg_bought_price=cost,
                daily_change_percent=daily_change_pct,
                daily_change_amount=change_amount,
            )
            
            if qty is not None and cost is not None:
                update.value = last_price * qty * multiplier
                update.unrealized_pnl = (last_price - cost) * qty * multiplier

            # 7. Send the update to the frontend
            await self._broadcast(update.model_dump())
    
    
    async def _dispatch_active_stock_update(self: ServiceProtocol, msg: dict):
        """
        Creates and sends ONE rich, detailed update for the single active stock,
        including a timestamp so the frontend can build the live chart bar.
        """
        last_price = extract_price_from_snapshot(msg)

        if last_price is None:
            return

        conid = int(msg["topic"].split("+", 1)[1])

        # Construct ONE message with all the data the frontend needs
        update_payload = {
            "type": "active_stock_update",
            "timestamp": int(time.time()), # The crucial timestamp
            "conid": conid,
            "lastPrice": last_price,
            "changeAmount": safe_float_conversion(msg.get("82")),
            "changePercent": safe_float_conversion(msg.get("83")),
            "bid": safe_float_conversion(msg.get("84")),
            "ask": safe_float_conversion(msg.get("86")),
            "dayHigh": safe_float_conversion(msg.get("70")),
            "dayLow": safe_float_conversion(msg.get("71")),
        }
        
        # Filter out null values to keep the payload clean
        final_payload = {k: v for k, v in update_payload.items() if v is not None}

        await self._broadcast(final_payload)

    async def _process_ibkr_message(self: ServiceProtocol, raw_message: str | bytes):
        """Parses and dispatches a single message from the IBKR WebSocket."""
        if isinstance(raw_message, bytes):
            raw_message = raw_message.decode()
        try:
            msgs = json.loads(raw_message)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                if not isinstance(msg, dict):
                    continue
                topic = msg.get("topic", "")
                
                if topic.startswith("smd+"):
                    conid = int(topic.split("+", 1)[1])
                    if self.state.active_stock_conid and conid == self.state.active_stock_conid:
                        await self._dispatch_active_stock_update(msg)
                    else:
                        await self._dispatch_tick(msg)
                
                elif topic == "spl":
                    await self._dispatch_pnl(msg)
                    
                elif topic.startswith("sbd+"):
                    await self._dispatch_book_data(msg)
                    
                elif topic.startswith("smh+"):
                    await self._dispatch_chart_data(msg)

        except (json.JSONDecodeError, UnicodeDecodeError):
            # This can happen with heartbeat messages, safe to ignore.
            return

    # --- Background Tasks (Private) ---
    async def _ws_heartbeat(self: ServiceProtocol):
        """Sends a heartbeat ping every 30 seconds to keep the session alive."""
        # Correctly get the session from the state object
        ws = self.state.ibkr_websocket_session
        
        # Add a check to ensure 'ws' is not None before entering the loop
        if not ws:
            log.warning("Heartbeat cannot start; WebSocket session is not available.")
            return

        while self.state.ws_connected:
            try:
                await asyncio.sleep(30)
                await ws.send("tic")
            except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
                break # Exit gracefully

    async def _ws_allocation_refresher(self: ServiceProtocol, account_id: str):
        """Periodically refreshes and broadcasts account allocation data."""
        while self.state.ws_connected:
            try:
                log.info(f"Refreshing account allocation for {account_id}...")
                fresh_data = await self.account_allocation(account_id)
                await self._broadcast({
                    "type": "allocation",
                    "data": fresh_data
                })
                await asyncio.sleep(300) # Refresh every 5 minutes
            except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
                break
            except Exception as e:
                log.error(f"Failed to refresh allocation data: {e}")
                await asyncio.sleep(60) # Wait longer on error
    
    
    async def _send_initial_allocation(self: ServiceProtocol, account_id: str):
        """
        Checks for cached allocation data, fetches if absent, and broadcasts it.
        This ensures new connections get data immediately.
        """
        log.info("Preparing to send initial allocation data...")
        # The account_allocation method uses a cache, so this is efficient.
        # It will only hit the network if the cache is empty or stale.
        try:
            data_to_send = await self.account_allocation(account_id)
            
            await self._broadcast({
                "type": "allocation",
                "data": data_to_send
            })
            log.info("Successfully sent initial allocation data.")
        except Exception as e:
            log.error(f"Could not send initial allocation data: {e}")

    # --- Main WebSocket Loop (Private) ---
    async def _websocket_loop(self: ServiceProtocol, account_id: str):
        """
        Maintains a persistent connection to the IBKR WebSocket.
        Its ONLY job is to connect, run background tasks, and process incoming messages.
        """
        gateway_ws_url = GATEWAY_BASE_URL.replace("https", "wss")
        uri = f"{gateway_ws_url}/v1/api/ws"
        cookie = f'api={{"session":"{self.state.ibkr_session_token}"}}'
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        while not self.state.shutdown_signal.is_set():
            # Define tasks as None before the try block
            heartbeat_task = None
            allocation_task = None
            try:
                log.info(f"Connecting to IBKR WebSocket for account: {account_id}")
                async with websockets.connect(
                    uri,
                    ssl=ssl_ctx,
                    compression=None,
                    ping_interval=None,
                    additional_headers=[("Cookie", cookie)]
                ) as ws:
                    # --- Connection is live ---
                    self.state.ws_connected = True
                    self.state.ibkr_websocket_session = ws
                    log.info("✅ IBKR WebSocket connection established.")

                    # --- Start Background Tasks ---
                    heartbeat_task = asyncio.create_task(self._ws_heartbeat())
                    allocation_task = asyncio.create_task(self._ws_allocation_refresher(account_id))

                    # --- Main Receive Loop ---
                    async for raw in ws:
                        await self._process_ibkr_message(raw)

            except Exception as exc:
                log.warning(f"IBKR WS loop error: {exc}")
            
            finally:
                # --- Cleanup on Disconnect ---
                log.info("Cleaning up IBKR WebSocket connection...")
                self.state.ws_connected = False
                self.state.ibkr_websocket_session = None
                self.state.pnl_subscribed = False # Reset the flag

                # Safely cancel background tasks
                if heartbeat_task and not heartbeat_task.done():
                    heartbeat_task.cancel()
                if allocation_task and not allocation_task.done():
                    allocation_task.cancel()

                # Attempt to reconnect if not shutting down
                if not self.state.shutdown_signal.is_set():
                    log.info("Will attempt to reconnect in 15 seconds...")
                    await asyncio.sleep(15)

        log.info("Exited IBKR WebSocket loop because shutdown was signaled.")