"""Server main runtime."""
import uvicorn
from app import app, api_app
from routes.auth import router as AuthRouter
from routes.mail import router as MailRouter
from routes.register import router as RegisterRouter
from routes.user import router as UserRouter
from routes.stock import router as StockRouter
from routes.transaction import router as TransactionRouter
from routes.PortfolioSnapshot import router as  PortfolioSnapshotRouter
from routes.friend import router as FriendsRouter


# Include routers in the API app
api_app.include_router(AuthRouter, prefix="/auth")
api_app.include_router(MailRouter, prefix="/mail")
api_app.include_router(RegisterRouter, prefix="/register")
api_app.include_router(UserRouter, prefix="/user")
api_app.include_router(StockRouter, prefix="/stock")
api_app.include_router(TransactionRouter, prefix="/transaction")
api_app.include_router(PortfolioSnapshotRouter, prefix="/portfolio-snapshot")
api_app.include_router(FriendsRouter, prefix="/friends")



if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",
        reload=False,
        port=8000,
    )
    

