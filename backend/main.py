import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List 
from fastapi import FastAPI, Depends, HTTPException, Request
from config import AppConfig, load_config
from app_state import AppState
from ibkr_service import IBKRService
from frontend_gateway import FrontendGateway
from models import AuthStatus, ChartDataBars, ChartDataPoint
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
    app.state.frontend_task = asyncio.create_task(frontend_gateway_instance.run())
    app.state.ibkr_task = asyncio.create_task(
        ibkr_service_instance.start_services(frontend_gateway_instance.broadcast_to_clients)
    )
    
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
    ibkr_service: IBKRService = Depends(get_ibkr_service),
    frontend_gateway: FrontendGateway = Depends(get_frontend_gateway) 
):
    # Get current auth status
    auth_status = await ibkr_service.get_auth_status_details()
    
    # If authenticated but websocket isn't running, start services
    if auth_status.authenticated and not auth_status.websocket_ready:
        try:
            # You'll need to pass your broadcast_callback function here
            # This is typically your websocket broadcast function for sending updates to frontend
            app.state.ibkr_task = asyncio.create_task(
                ibkr_service_instance.start_services(frontend_gateway.broadcast_to_clients)
            )
            
            # Get updated status after starting services
            auth_status = await ibkr_service.get_auth_status_details()
            
        except Exception as e:
            logger.error(f"Failed to start IBKR services: {e}")
            # Optionally add error info to the response
            auth_status.error = f"Services start failed: {str(e)}"
    
    return auth_status

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
async def get_performance_history(
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



# Define the period to IBKR parameters mapping
# Frontend Period -> { IBKR API period, Default IBKR API bar }
PERIOD_BAR_MAPPING = {
    "1D": {"period_ibkr": "1d", "bar_ibkr": "2min"},  
    "7D": {"period_ibkr": "1w", "bar_ibkr": "15min"},  
    "1M": {"period_ibkr": "1m", "bar_ibkr": "1h"},    
    "3M": {"period_ibkr": "3m", "bar_ibkr": "3h"},    
    "6M": {"period_ibkr": "6m", "bar_ibkr": "1d"},    
    "1Y": {"period_ibkr": "1y", "bar_ibkr": "1d"},     
}

@app.get( 
    "/stocks/history",
    response_model=List[ChartDataBars],
    summary="Get Historical Stock Prices (with default bars)",
    tags=["Market Data"]
)
async def get_stock_history(
    ticker: str,
    period: str = "1M",  # Default period if not provided by frontend
    ibkr_service: IBKRService = Depends(get_ibkr_service)
):
    """
    Fetch historical price data for a given stock ticker symbol (e.g., TSLA).
    The 'bar' size is automatically determined based on IBKR's defaults for the chosen 'period'.
    Converts the data to chart-friendly format: [{ time, value }]
    """
    if period not in PERIOD_BAR_MAPPING:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period '{period}'. Valid periods are: {', '.join(PERIOD_BAR_MAPPING.keys())}"
        )

    ibkr_params = PERIOD_BAR_MAPPING[period]
    ibkr_period_val = ibkr_params["period_ibkr"]
    ibkr_bar_val = ibkr_params["bar_ibkr"]

    logger.info(f"Fetching historical data for {ticker} with period: {period} (IBKR period: {ibkr_period_val}, IBKR bar: {ibkr_bar_val})")

    try:
        conid = await ibkr_service.get_conid_for_symbol(ticker)
        if not conid:
            raise HTTPException(status_code=404, detail=f"Could not find conid for ticker '{ticker}'.")

        raw_data = await ibkr_service.fetch_historical_data(
            conid=conid,
            period=ibkr_period_val, # Use the mapped IBKR period
            bar=ibkr_bar_val        # Use the determined IBKR bar
        )

        if not raw_data or "data" not in raw_data or not raw_data["data"]:
            logger.warning(f"No data returned from IBKR for {ticker}, period {ibkr_period_val}, bar {ibkr_bar_val}. Raw: {raw_data}")
            return []  # Return empty list as per your original logic

        chart_data = []
        for item in raw_data.get("data", []):
            try:
                # Ensure 't' and 'c' exist and are of expected types
                if 't' not in item or 'c' not in item:
                    logger.warning(f"Skipping bar with missing 't' or 'c': {item}")
                    continue
                
                ts = int(item["t"]) // 1000  # Convert ms to seconds
                value = float(item["c"])     # Close price
                # chart_data.append({"time": ts, "value": value})
                chart_data.append({
                    "time": ts,
                    "open": float(item["o"]),
                    "high": float(item["h"]),
                    "low": float(item["l"]),
                    "close": value,
                    "value": value,
                    "volume": float(item["v"])
                })
            except (TypeError, ValueError) as e: # More specific exception handling
                logger.warning(f"Skipping malformed bar: {item}, reason: {e}")
            except Exception as e:
                logger.warning(f"Unexpected error processing bar: {item}, reason: {e}")


        if not chart_data and raw_data.get("data"):
             logger.warning(f"Data was present in raw_data but chart_data is empty for {ticker}. Check processing logic.")


        return chart_data
    except HTTPException: # Re-raise HTTPExceptions to let FastAPI handle them
        raise
    except Exception as e:
        logger.error(f"Failed to fetch historical data for {ticker} (period: {period}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")
    
@app.get("/stock/quote/{ticker}")
async def getStockQuote(ticker:str, ibkr_service: IBKRService = Depends(get_ibkr_service)):
    try:
        conid = await ibkr_service.get_conid_for_symbol(ticker)
        if not conid:
            raise HTTPException(status_code=404, detail=f"Could not find conid for ticker '{ticker}'.")

        # market_data_sub = await ibkr_service.check_market_data_subscriptions()
        raw_data = await ibkr_service.fetch_stock_data(conid)
        price_data = ibkr_service.calculate_daily_change_percentage(raw_data)
        
        return {
            "ticker": ticker,
            "conid": conid,
            **price_data
        }
         
    except Exception as e:
        logger.error(f"Failed to fetch  data for {ticker} : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")
    

# To run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload