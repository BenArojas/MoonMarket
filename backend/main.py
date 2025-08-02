import logging

from fastapi.responses import JSONResponse
from rate_control import RateLimitExceededException

# ---- global logging setup *first* ----
logging.basicConfig(
    level=logging.INFO,                      
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from ibkr import IBKRService
from models import AuthStatusDTO
from starlette.middleware.cors import CORSMiddleware
from gateway_ws import router as ws_router, broadcast
from routers.market import router as market_router
from routers.account import router as account_router
from routers.watchlist import router as watchlist_router
from routers.account_transactions import router as transactions_router
from routers.scanner import router as scanner_router
from routers.ai_service import router as ai_router
# --- Global instances and config loading ---
from deps import get_ibkr_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    svc = IBKRService()
    svc.set_broadcast(broadcast) 
    app.state.ibkr = svc 
    yield
    print("Application shutdown: Cleaning up IBKR resources.")
    await app.state.ibkr.shutdown_websocket_task()

    
app = FastAPI(lifespan=lifespan)
@app.exception_handler(RateLimitExceededException)
async def rate_limit_exception_handler(request, exc: RateLimitExceededException):
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Rate limit exceeded for endpoint {exc.endpoint}",
            "retry_after": exc.retry_after,
            "endpoint": exc.endpoint
        },
        headers={"Retry-After": str(exc.retry_after)} if exc.retry_after else {}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ws_router)
app.include_router(market_router)    
app.include_router(account_router)
app.include_router(watchlist_router)
app.include_router(transactions_router)
app.include_router(scanner_router)
app.include_router(ai_router)


@app.get("/auth/status", response_model=AuthStatusDTO)
async def auth_status(svc: IBKRService = Depends(get_ibkr_service)):
    """
    Call this from the FE.  
    If the user is already logged into the *gateway* on <https://localhost:5000>,
    we become authenticated and the WS starts automatically.
    """
    return await svc.check_and_authenticate()

@app.post("/auth/logout")
async def logout(svc: IBKRService = Depends(get_ibkr_service)):
    """
    Logs out of the IBKR session and terminates the persistent WebSocket connection.
    """
    await svc.shutdown_websocket_task()
    
    return await svc.logout() 



# To run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload