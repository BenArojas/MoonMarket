import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List 
from fastapi import FastAPI, Depends, HTTPException, Request
from config import AppConfig, load_config
from app_state import AppState
from ibkr_service import IBKRService
from frontend_gateway import FrontendGateway
from models import AuthStatus, ChartDataPoint
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
    
@app.get(
    "/account/performance-history",
    response_model=List[ChartDataPoint],
    summary="Get Account Performance History",
    tags=["Account Data"]
)
async def get_performance_history_for_chart(
    ibkr_service: IBKRService = Depends(get_ibkr_service),
    period: str = "1Y",  # Default to 1 Year, frontend can override
):
    """
    Retrieves historical Net Asset Value (NAV) for the logged-in account,
    formatted for time-series charts.
    
    Available periods: "1D", "7D", "MTD", "1M", "YTD", "1Y".
    """
    valid_periods = ["1D", "7D", "MTD", "1M", "YTD", "1Y"]
    if period not in valid_periods:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid period '{period}'. Valid periods are: {', '.join(valid_periods)}"
        )

    try:
        historical_account_performance_data = await ibkr_service.fetch_account_performance_history(period=period)
        # The data is already in the desired format: List[{"time": ..., "value": ...}]
        return historical_account_performance_data
    except Exception as e:
        # Log the exception 'e' if not already logged deep within the service call
        logger.error(f"API endpoint error fetching performance history for period {period}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while fetching account performance history.")
    
@app.get(
    "/stocks/history",
    response_model=List[ChartDataPoint],
    summary="Get Historical Stock Prices",
    tags=["Market Data"]
)
async def get_stock_history(
    ticker: str,
    period: str = "1M",  # Default to 1 month
    bar: str = "1d",
    ibkr_service: IBKRService = Depends(get_ibkr_service)
):
    """
    Fetch historical price data for a given stock ticker symbol (e.g., TSLA).
    Converts the data to chart-friendly format: [{ time, value }]
    """
    # Add validation like the first function
    valid_periods = ["1D", "7D", "1M", "3M", "6M", "1Y"]  # Adjust based on IBKR API
    valid_bars = ["1min", "5min", "15min", "30min", "1h", "1d"]  # Adjust based on IBKR API
    
    if period not in valid_periods:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid period '{period}'. Valid periods are: {', '.join(valid_periods)}"
        )
    
    if bar not in valid_bars:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid bar '{bar}'. Valid bars are: {', '.join(valid_bars)}"
        )
    try:
        conid = await ibkr_service.get_conid_for_symbol(ticker)
        if not conid:
            raise HTTPException(status_code=404, detail=f"Could not find conid for ticker '{ticker}'.")

        raw_data = await ibkr_service.fetch_historical_data(conid=conid, period=period, bar=bar)
        if not raw_data or not raw_data.get("data"):
            return []  # Return empty list instead of error

        chart_data = []
        for item in raw_data.get("data", []):
            try:
                ts = int(item["t"]) // 1000  # Convert ms to seconds
                value = float(item["c"])     # Close price
                chart_data.append({"time": ts, "value": value})
            except Exception as e:
                logger.warning(f"Skipping malformed bar: {item}, reason: {e}")

        return chart_data
    except Exception as e:
        logger.error(f"Failed to fetch historical data for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")

# To run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload