import logging

# ---- global logging setup *first* ----
logging.basicConfig(
    level=logging.INFO,                       # or DEBUG
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from ibkr_service import AuthStatusDTO, IBKRService
from starlette.middleware.cors import CORSMiddleware
from gateway_ws import router as ws_router, broadcast
from routers.market import router as market_router
from routers.account import router as account_router
from routers.watchlist import router as watchlist_router
# --- Global instances and config loading ---
from deps import get_ibkr_service

svc = IBKRService()
svc.set_broadcast(broadcast) 

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ibkr = svc 
    yield
    await svc.stop() 
    
app = FastAPI(lifespan=lifespan)

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



@app.get("/auth/status", response_model=AuthStatusDTO)
async def auth_status(svc: IBKRService = Depends(get_ibkr_service)):
    """
    Call this from the FE.  
    If the user is already logged into the *gateway* on <https://localhost:5000>,
    we become authenticated and the WS starts automatically.
    """
    return await svc.check_and_authenticate()



# To run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload