# ibkr_service.py
import asyncio
import httpx
import json
import logging
import ssl
import websockets
from websockets.client import ClientProtocol
from typing import Optional, Callable, Awaitable, List, Dict, Any
from config import AppConfig
from app_state import AppState
from models import AuthStatus, FrontendAccountSummaryUpdate, FrontendMarketDataUpdate, PositionData, AccountSummaryData

logger = logging.getLogger(__name__)

class IBKRService:
    def __init__(self, config: AppConfig, app_state: AppState):
        self.config = config
        self.app_state = app_state
        self.http_client = httpx.AsyncClient(verify=False, timeout=10) # verify=False for localhost SSL
        self._ibkr_ws: Optional[ClientProtocol] = None
        self._ws_listener_task: Optional[asyncio.Task] = None
        self._ws_heartbeat_task: Optional[asyncio.Task] = None
        self._session_tickler_task: Optional[asyncio.Task] = None
        self._broadcast_callback: Optional[Callable[[str], Awaitable[None]]] = None
        self._ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        self._ssl_context.check_hostname = False
        self._ssl_context.verify_mode = ssl.CERT_NONE

    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Optional[httpx.Response]:
        try:
            url = f"{self.config.ibkr_api_url}{endpoint}"
            response = await self.http_client.request(method, url, **kwargs)
            response.raise_for_status() # Raise an exception for bad status codes
            return response
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error for {method} {endpoint}: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error for {method} {endpoint}: {e}")
        return None

    async def sso_validate(self) -> bool:
        response = await self._make_request("GET", "/sso/validate")
        if response and response.status_code == 200:
            logger.info("SSO validation successful.")
            self.app_state.ibkr_authenticated = True
            return True
        logger.warning("SSO validation failed.")
        self.app_state.ibkr_authenticated = False
        return False

    async def tickle_session(self) -> bool:
        response = await self._make_request("POST", "/tickle")
        if response and response.status_code == 200:
            session_data = response.json()
            self.app_state.ibkr_session_token = session_data.get("session")
            if self.app_state.ibkr_session_token:
                logger.info("Session tickled successfully, session token updated.")
                self.app_state.ibkr_authenticated = True # Tickle implies auth active
                return True
            else:
                logger.warning("Tickle successful but no session token found in response.")
        else:
            logger.error(f"Session tickle failed.")
            self.app_state.ibkr_authenticated = False # If tickle fails, assume session might be dead
        return False

    async def maintain_session_tickle_task(self):
        while True:
            await self.tickle_session()
            await asyncio.sleep(60) # Tickle every 60 seconds

    async def get_account_id_from_api(self) -> Optional[str]:
        if self.app_state.ibkr_account_id:
            return self.app_state.ibkr_account_id
        
        response = await self._make_request("GET", "/portfolio/accounts")
        if response:
            accounts = response.json()
            if accounts and isinstance(accounts, list) and accounts[0].get('accountId'):
                self.app_state.ibkr_account_id = accounts[0]['accountId']
                logger.info(f"Fetched IBKR Account ID: {self.app_state.ibkr_account_id}")
                return self.app_state.ibkr_account_id
        logger.error("Could not retrieve account ID.")
        return None

    async def fetch_portfolio_positions_from_api(self) -> List[PositionData]:
        account_id = self.app_state.ibkr_account_id or await self.get_account_id_from_api()
        if not account_id: return []

        response = await self._make_request("GET", f"/portfolio/{account_id}/positions")
        if not response: return []
        
        positions_api_data = response.json()
        updated_positions = []
        if isinstance(positions_api_data, list):
            for pos_data in positions_api_data:
                conid = pos_data.get('conid')
                if not conid: continue
                
                position = PositionData(
                    symbol=pos_data.get('contractDesc', 'N/A'),
                    conid=int(conid),
                    last_price=pos_data.get('mktPrice', 0.0),
                    avg_bought_price=pos_data.get('avgCost', 0.0),
                    quantity=pos_data.get('position', 0.0),
                    mkt_value=pos_data.get('mktValue', 0.0),
                    unrealized_pnl=pos_data.get('unrealizedPnl', 0.0)
                )
                self.app_state.update_or_create_position(str(conid), position)
                updated_positions.append(position)
            logger.info(f"Fetched and updated {len(updated_positions)} positions.")
        return updated_positions

    async def fetch_account_summary_from_api(self) -> Optional[AccountSummaryData]:
        account_id = self.app_state.ibkr_account_id or await self.get_account_id_from_api()
        if not account_id: return None

        response = await self._make_request("GET", f"/portfolio/{account_id}/summary")
        if not response: return None
        
        summary_api_data = response.json()
        # Transform to AccountSummaryData model
        # This example is basic; you'd map specific known fields and put others in additional_details
        mapped_summary = {
            key.lower().replace(' ', '_'): details.get("amount") if isinstance(details, dict) else details
            for key, details in summary_api_data.items()
            if isinstance(details, dict) and "amount" in details # Only take items with amount
        }
        
        summary = AccountSummaryData(
            net_liquidation=mapped_summary.get("netliquidation"),
            total_cash_value=mapped_summary.get("totalcashvalue"),
            buying_power=mapped_summary.get("buyingpower"),
            additional_details={k:v for k,v in summary_api_data.items() if k.lower().replace(' ', '_') not in mapped_summary}
        )
        self.app_state.update_account_summary(summary)
        logger.info("Fetched and updated account summary.")
        return summary

    async def _ws_send_heartbeat_task(self):
        try:
            while self._ibkr_ws and not self._ibkr_ws.state == websockets.protocol.State.CLOSED:
                await asyncio.sleep(30)
                if self._ibkr_ws and not self._ibkr_ws.state == websockets.protocol.State.CLOSED:  # Re-check before send
                    await self._ibkr_ws.send('tic')
                    logger.debug("Sent 'tic' heartbeat to IBKR WS.")
        except websockets.ConnectionClosed:
            logger.info("IBKR WS connection closed during heartbeat task.")
        except Exception as e:
            logger.error(f"Error in IBKR WS heartbeat task: {e}")

    async def _process_ibkr_ws_message(self, message_str: str):
        logger.debug(f"IBKR WS Recv: {message_str}")
        try:
            messages_list = json.loads(message_str) if message_str.startswith('[') else [json.loads(message_str)]
        except json.JSONDecodeError:
            if "sok" in message_str or "ack" in message_str: # Subscription confirmation or ack
                logger.info(f"IBKR WS confirmation: {message_str}")
            else:
                logger.warning(f"Non-JSON/unhandled message from IBKR WS: {message_str}")
            return

        for ibkr_msg in messages_list:
            if not isinstance(ibkr_msg, dict): continue
            topic = ibkr_msg.get("topic", "")

            if topic == "hb": continue # Handled by our 'tic' sender
            if topic == "system": logger.info(f"IBKR System: {ibkr_msg.get('message')}"); continue

            # Market Data Processing
            conid_from_topic = None
            if topic.startswith("smd+"):
                try: conid_from_topic = topic.split('+')[1]
                except IndexError: pass
            
            data_payload = ibkr_msg.get("args", ibkr_msg) # Some APIs nest data in 'args'
            if not isinstance(data_payload, dict): data_payload = ibkr_msg # Fallback

            msg_conid_str = str(data_payload.get("conid", conid_from_topic))

            if msg_conid_str != "None" and (position := self.app_state.get_position(msg_conid_str)):
                new_price = None
                if "31" in data_payload: new_price = float(data_payload["31"]) # Last Price
                elif "7295" in data_payload: new_price = float(data_payload["7295"]) # Mark Price

                if new_price is not None and position.last_price != new_price:
                    position.update_market_data(new_price)
                    if self._broadcast_callback:
                        await self._broadcast_callback(json.dumps(FrontendMarketDataUpdate.from_position_data(position).model_dump()))
            
            # Account Summary Processing (if subscribed via WS)
            elif topic.startswith("sor+"):
                logger.info(f"IBKR WS account update (sor): {ibkr_msg}. Triggering summary fetch via API.")
                # For simplicity, re-fetch summary via REST. Direct parsing of 'sor' could be added.
                new_summary = await self.fetch_account_summary_from_api()
                if new_summary and self._broadcast_callback:
                    await self._broadcast_callback(json.dumps(FrontendAccountSummaryUpdate(data=new_summary.model_dump(exclude_none=True)).model_dump()))


    async def _ws_listener_loop(self):
        if not self._ibkr_ws: return
        try:
            async for message_str in self._ibkr_ws:
                await self._process_ibkr_ws_message(message_str)
        except websockets.ConnectionClosedError as e:
            logger.warning(f"IBKR WebSocket connection closed: {e}")
        except Exception as e:
            logger.error(f"Error in IBKR WebSocket listener loop: {e}", exc_info=True)
        finally:
            self.app_state.ibkr_websocket_connected = False
            if self._ws_heartbeat_task and not self._ws_heartbeat_task.done():
                self._ws_heartbeat_task.cancel()

    async def manage_ibkr_websocket_connection(self, broadcast_callback: Callable[[str], Awaitable[None]]):
        self._broadcast_callback = broadcast_callback
        while True:
            if not self.app_state.ibkr_authenticated or not self.app_state.ibkr_session_token:
                logger.info("IBKR not authenticated or session token missing. WS connection deferred.")
                await asyncio.sleep(5)
                continue
            
            try:
                logger.info(f"Attempting to connect to IBKR WebSocket: {self.config.ibkr_ws_url}")
                async with websockets.connect(str(self.config.ibkr_ws_url), ssl=self._ssl_context) as ws:
                    self._ibkr_ws = ws
                    self.app_state.ibkr_websocket_connected = True
                    logger.info("Successfully connected to IBKR WebSocket.")

                    # Start heartbeat task
                    if self._ws_heartbeat_task and not self._ws_heartbeat_task.done(): self._ws_heartbeat_task.cancel()
                    self._ws_heartbeat_task = asyncio.create_task(self._ws_send_heartbeat_task())

                    # Initial data fetch and subscriptions
                    await self.get_account_id_from_api() # Ensure account ID is loaded
                    initial_positions = await self.fetch_portfolio_positions_from_api()
                    for pos in initial_positions: # Broadcast initial state
                        if self._broadcast_callback:
                            await self._broadcast_callback(json.dumps(FrontendMarketDataUpdate.from_position_data(pos).model_dump()))
                    
                    initial_summary = await self.fetch_account_summary_from_api()
                    if initial_summary and self._broadcast_callback:
                        await self._broadcast_callback(json.dumps(FrontendAccountSummaryUpdate(data=initial_summary.model_dump(exclude_none=True)).model_dump()))

                    # Subscribe to market data for all current positions
                    conids_to_subscribe = [str(p.conid) for p in self.app_state.current_positions.values()]
                    for conid_str in conids_to_subscribe:
                        sub_msg = f'smd+{conid_str}+{{"fields":["31", "7295"]}}' # Last, Mark Price
                        await self._ibkr_ws.send(sub_msg)
                        logger.info(f"Subscribed to market data for conid {conid_str}")
                    
                    # Start listener loop (blocks until connection closes)
                    await self._ws_listener_loop()

            except ConnectionRefusedError:
                logger.error(f"IBKR WebSocket connection refused. Is Gateway/Portal running at {self.config.ibkr_ws_url}?")
            except Exception as e:
                logger.error(f"Error in IBKR WebSocket management: {e}", exc_info=True)
            
            # Cleanup and retry delay
            self.app_state.ibkr_websocket_connected = False
            if self._ibkr_ws and not self._ibkr_ws.state == websockets.protocol.State.CLOSED: await self._ibkr_ws.close()
            self._ibkr_ws = None
            if self._ws_heartbeat_task and not self._ws_heartbeat_task.done(): self._ws_heartbeat_task.cancel()
            
            logger.info("Retrying IBKR WebSocket connection in 15 seconds...")
            await asyncio.sleep(15)

    async def start_services(self, broadcast_callback: Callable[[str], Awaitable[None]]):
        # Initial auth check
        await self.sso_validate()
        
        # Start background tasks
        if self._session_tickler_task and not self._session_tickler_task.done(): self._session_tickler_task.cancel()
        self._session_tickler_task = asyncio.create_task(self.maintain_session_tickle_task())

        if self._ws_listener_task and not self._ws_listener_task.done(): self._ws_listener_task.cancel()
        self._ws_listener_task = asyncio.create_task(self.manage_ibkr_websocket_connection(broadcast_callback))

    async def stop_services(self):
        logger.info("Stopping IBKR services...")
        
        # Cancel tasks
        if self._session_tickler_task: 
            self._session_tickler_task.cancel()
        if self._ws_listener_task: 
            self._ws_listener_task.cancel()
        if self._ws_heartbeat_task: 
            self._ws_heartbeat_task.cancel()
        
        # Close WebSocket connection - check state instead of closed attribute
        if self._ibkr_ws and self._ibkr_ws.state != websockets.protocol.State.CLOSED:
            await self._ibkr_ws.close()
        
        # Close HTTP client
        await self.http_client.aclose()
        # Reset connection state
        self._ibkr_ws = None
        self._ws_listener_task = None
        self._ws_heartbeat_task = None
        self._session_tickler_task = None
        logger.info("IBKR services stopped.")

    async def get_auth_status_details(self) -> AuthStatus:
        """Provides detailed authentication status, similar to user's original endpoint."""
        is_authenticated = self.app_state.ibkr_authenticated
        status_kwargs = {"authenticated": is_authenticated}

        if is_authenticated:
            try:
                # This makes an actual /tickle call to get freshest data, could also use AppState if preferred for less IO
                response = await self.http_client.post(f"{self.config.ibkr_api_url}/tickle") # No raise_for_status here
                if response and response.status_code == 200:
                    auth_data = response.json()
                    
                    # Convert user_id to string to match Pydantic model expectations
                    user_id = auth_data.get("userId", "unknown")
                    if isinstance(user_id, int):
                        user_id = str(user_id)
                    
                    status_kwargs.update({
                        "session_active": True,
                        "session_id_short": (auth_data.get("session", "")[:8] + "...") if auth_data.get("session") else "unknown",
                        "user_id": user_id,
                        "iserver_status": auth_data.get("iserver", {}).get("authStatus", {}),
                        "websocket_ready": self.app_state.ibkr_websocket_connected
                    })
                else:
                    status_kwargs["session_active"] = False
                    status_kwargs["message"] = "Tickle failed or session inactive."
                    if response: status_kwargs["message"] += f" Status: {response.status_code}"
            except Exception as e:
                logger.error(f"Error getting detailed auth status from tickle: {e}")
                status_kwargs["session_active"] = False
                status_kwargs["error"] = str(e)
        else:
            status_kwargs["message"] = f"Please authenticate. Gateway might not be running or logged in."
        
        return AuthStatus(**status_kwargs)
    
    async def logout(self) -> dict:
        """
        Perform logout operations - close IBKR WebSocket and clean up sessions.
        Returns details about the logout operation.
        """
        logger.info("Starting logout process...")
        logout_details = {
            "ibkr_websocket_closed": False,
            "session_invalidated": False,
            "tasks_cancelled": False
        }
        
        try:
            # 1. Stop all background tasks and close WebSocket
            await self.stop_services()
            logout_details["ibkr_websocket_closed"] = True
            logout_details["tasks_cancelled"] = True
            
            # 2. Optional: Make HTTP request to IBKR logout endpoint if available
            try:
                logout_response = await self.http_client.post(
                    f"{self.config.ibkr_api_url}/logout",
                    json={}
                )
                if logout_response.status_code == 200:
                    logout_details["session_invalidated"] = True
                    logger.info("IBKR session invalidated via HTTP")
            except Exception as e:
                logger.warning(f"Could not invalidate IBKR session via HTTP: {e}")
            
            # 3. Clear any cached authentication state
            
            
            logger.info("Logout completed successfully")
            return logout_details
            
        except Exception as e:
            logger.error(f"Error during logout: {e}", exc_info=True)
            raise