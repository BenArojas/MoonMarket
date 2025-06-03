# frontend_gateway.py
import asyncio
import datetime
import json
import logging
import websockets
from typing import Callable, Awaitable, Optional
from websockets.server import ServerProtocol
from config import AppConfig
from app_state import AppState
from models import FrontendMarketDataUpdate, FrontendAccountSummaryUpdate, WatchlistMessage # PositionData, AccountSummaryData

logger = logging.getLogger(__name__)

class FrontendGateway:
    def __init__(self, config: AppConfig, app_state: AppState): # Removed ibkr_service dependency
        self.config = config
        self.app_state = app_state
        self._server_task: Optional[asyncio.Task] = None

    async def _send_initial_data(self, websocket: ServerProtocol):
        logger.info(f"Sending initial data to client {websocket.remote_address}")
        # Send Account Summary
        if self.app_state.account_summary:
            summary_msg = FrontendAccountSummaryUpdate(data=self.app_state.account_summary.model_dump(exclude_none=True))
            await websocket.send(json.dumps(summary_msg.model_dump()))
            
        if hasattr(self.app_state, 'watchlists') and self.app_state.watchlists:
            watchlist_msg_obj = WatchlistMessage(data=self.app_state.watchlists)
            await websocket.send(json.dumps(watchlist_msg_obj.model_dump()))

        # Send All Positions
        for conid_str, position in self.app_state.current_positions.items():
            market_data_msg = FrontendMarketDataUpdate.from_position_data(position)
            await websocket.send(json.dumps(market_data_msg.model_dump()))
            await asyncio.sleep(0.01) # Small delay to prevent flooding

    async def handle_websocket_connection(self, websocket: ServerProtocol):
        # If you need the path, you can get it from websocket.path
        
        await self.app_state.add_frontend_client(websocket)
        logger.info(f"Frontend client connected: {websocket.remote_address}. Total clients: {len(self.app_state.frontend_clients)}")
        try:
            await self._send_initial_data(websocket)
            async for message in websocket: # Listen for messages from client (if any)
                logger.info(f"Received message from frontend {websocket.remote_address}: {message} (not processed)")
                # Example: if message == "REQUEST_REFRESH": await self._ibkr_service.trigger_full_refresh()
        except websockets.ConnectionClosedOK:
            logger.info(f"Frontend client {websocket.remote_address} disconnected gracefully.")
        except websockets.ConnectionClosedError as e:
            logger.warning(f"Frontend client {websocket.remote_address} disconnected with error: {e}")
        except Exception as e:
            logger.error(f"Error in frontend WebSocket handler for {websocket.remote_address}: {e}", exc_info=True)
        finally:
            await self.app_state.remove_frontend_client(websocket)
            logger.info(f"Frontend client {websocket.remote_address} removed. Total clients: {len(self.app_state.frontend_clients)}")

    async def broadcast_to_clients(self, message_json: str):
        """Broadcasts a JSON string message to all connected frontend clients."""
        if not self.app_state.frontend_clients:
            return

        # Create a list of tasks for sending messages to avoid issues if one client blocks
        # This also handles removal of clients that have disconnected abruptly
        disconnected_clients = set()
        active_clients = list(self.app_state.frontend_clients) # Iterate over a copy

        for client in active_clients:
            try:
                await client.send(message_json)
            except websockets.ConnectionClosed:
                logger.info(f"Client {client.remote_address} disconnected during broadcast. Removing.")
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error sending message to client {client.remote_address}: {e}")
                # Optionally, consider this client problematic and add to disconnected_clients
        
        if disconnected_clients:
            for client in disconnected_clients: # Ensure removal from the actual set
                 await self.app_state.remove_frontend_client(client)


    async def start_server(self):
        try:
            server = await websockets.serve(
                self.handle_websocket_connection,
                "0.0.0.0",
                self.config.websocket_port
            )
            logger.info(f"Frontend WebSocket server started on ws://0.0.0.0:{self.config.websocket_port}")
            await server.wait_closed()
        except OSError as e: # Handle "address already in use"
            logger.error(f"Failed to start Frontend WebSocket server on port {self.config.websocket_port}: {e}")
            # Potentially re-raise or exit application
        except Exception as e:
            logger.error(f"Unexpected error starting Frontend WebSocket server: {e}", exc_info=True)


    async def run(self): # Main entry point for this service if run as a task
        self._server_task = asyncio.create_task(self.start_server())
        try:
            await self._server_task
        except asyncio.CancelledError:
            logger.info("Frontend gateway server task cancelled.")
        
    def stop(self):
        if self._server_task and not self._server_task.done():
            self._server_task.cancel()
            logger.info("Frontend gateway server task stopping...")

    async def broadcast_logout_notification(self):
        """Send logout notification to all connected frontend clients."""
        if not self.app_state.frontend_clients:
            logger.info("No frontend clients to notify about logout")
            return
        
        logout_message = json.dumps({
            "type": "LOGOUT_NOTIFICATION",
            "message": "User has been logged out",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Send to all connected clients
        disconnected_clients = []
        for client in list(self.app_state.frontend_clients):
            try:
                await client.send(logout_message)
            except websockets.ConnectionClosed:
                # Client already disconnected
                disconnected_clients.append(client)
            except Exception as e:
                disconnected_clients.append(client)
        
        # Clean up disconnected clients
        for client in disconnected_clients:
            await self.app_state.remove_frontend_client(client)
    
    # async def close_all_client_connections(self):
    #     """Forcefully close all frontend WebSocket connections."""
    #     logger.info("Closing all frontend WebSocket connections...")
        
    #     clients_to_close = list(self.app_state.frontend_clients)
    #     for client in clients_to_close:
    #         try:
    #             await client.close()
    #         except Exception as e:
    #             logger.error(f"Error closing connection to {client.remote_address}: {e}")
        
    #     # Clear the clients list
    #     self.app_state.frontend_clients.clear()
    #     logger.info("All frontend connections closed")