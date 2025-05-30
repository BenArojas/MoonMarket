import asyncio
import logging
from contextlib import asynccontextmanager 
from fastapi import FastAPI, Depends, HTTPException
from config import AppConfig, load_config
from app_state import AppState
from ibkr_service import IBKRService
from frontend_gateway import FrontendGateway
from models import AuthStatus
from utils import setup_logging
from starlette.middleware.cors import CORSMiddleware

# --- Global instances and config loading ---
config: AppConfig = load_config()
setup_logging(config.log_level)
logger = logging.getLogger(__name__)

app_state_instance = AppState()
ibkr_service_instance = IBKRService(config, app_state_instance)
frontend_gateway_instance = FrontendGateway(config, app_state_instance)

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code here runs on startup
    logger.info("Application starting up with lifespan manager...")
    
    # Start IBKR Service (which includes session tickler and WebSocket manager)
    # The broadcast_callback from frontend_gateway is passed to ibkr_service
    # Store tasks if you need to explicitly await their completion or manage them further,
    # though for long-running background services, create_task is usually sufficient.
    app.state.ibkr_task = asyncio.create_task(
        ibkr_service_instance.start_services(frontend_gateway_instance.broadcast_to_clients)
    )
    app.state.frontend_task = asyncio.create_task(frontend_gateway_instance.run())
    
    logger.info("Background services scheduled via lifespan.")
    
    yield  # This is where the application runs
    
    # Code here runs on shutdown
    logger.info("Application shutting down via lifespan manager...")
    frontend_gateway_instance.stop() # Signal frontend gateway to stop
    await ibkr_service_instance.stop_services() # Ensure IBKR services are gracefully stopped

    # Optionally, wait for tasks to complete if they haven't been cancelled/stopped internally
    if hasattr(app.state, 'frontend_task') and app.state.frontend_task:
        try:
            await asyncio.wait_for(app.state.frontend_task, timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("Frontend gateway task did not finish cleanly on shutdown.")
        except asyncio.CancelledError:
            logger.info("Frontend gateway task was cancelled during shutdown.")


    if hasattr(app.state, 'ibkr_task') and app.state.ibkr_task:
        try:
            await asyncio.wait_for(app.state.ibkr_task, timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("IBKR service task did not finish cleanly on shutdown.")
        except asyncio.CancelledError:
            logger.info("IBKR service task was cancelled during shutdown.")

    logger.info("Application shutdown complete via lifespan.")

# --- FastAPI App ---
app = FastAPI(title="IBKR Data Streamer", lifespan=lifespan) # Assign lifespan here

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencies and endpoints (as before)
async def get_app_state() -> AppState:
    return app_state_instance

async def get_ibkr_service() -> IBKRService:
    return ibkr_service_instance

async def get_frontend_gateway() -> FrontendGateway:
    return frontend_gateway_instance

@app.get("/auth/status", response_model=AuthStatus)
async def auth_status_endpoint(
    ibkr_service: IBKRService = Depends(get_ibkr_service)
):
    return await ibkr_service.get_auth_status_details()

@app.post("/auth/logout")
async def auth_logout_endpoint(
    ibkr_service: IBKRService = Depends(get_ibkr_service),
    frontend_gateway: FrontendGateway = Depends(get_frontend_gateway)  
):
    """Logout endpoint that closes IBKR connection and notifies clients."""
    try:
        # Perform logout operations
        logout_result = await ibkr_service.logout()
        
        # Notify all connected frontend clients about logout
        await frontend_gateway.broadcast_logout_notification()
        
        return {"message": "Logged out successfully", "details": logout_result}
    except Exception as e:
        logger.error(f"Error during logout: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Logout failed")

# To run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload