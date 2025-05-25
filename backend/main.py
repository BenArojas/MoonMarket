"""Server main runtime."""
from app import app
from routes.auth import router as AuthRouter
# from routes.mail import router as MailRouter
from routes.register import router as RegisterRouter
from routes.user import router as UserRouter
from routes.stock import router as StockRouter
from routes.transaction import router as TransactionRouter
from routes.PortfolioSnapshot import router as  PortfolioSnapshotRouter
from routes.friend import router as FriendsRouter
from routes.apiKey import router as APIKeyRouter
from routes.redis import router as RedisRouter
from routes.watchlist import router as WatchlistRouter
from routes.ibkr import router as IbkrRouter

# app.include_router(MailRouter, prefix="/mail")
# app.include_router(RegisterRouter, prefix="/api/register")
# app.include_router(UserRouter, prefix="/api/user")
# app.include_router(StockRouter, prefix="/api/stock")
# app.include_router(TransactionRouter, prefix="/api/transaction")
# app.include_router(PortfolioSnapshotRouter, prefix="/api/portfolio-snapshot")
# app.include_router(FriendsRouter, prefix="/api/friends")
# app.include_router(APIKeyRouter, prefix="/api/api-key")
app.include_router(RedisRouter, prefix="/api/redis")
app.include_router(WatchlistRouter, prefix="/api/watchlist")
app.include_router(IbkrRouter, prefix="/api/ibkr")
app.include_router(AuthRouter, prefix="/api/auth")




if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
    

