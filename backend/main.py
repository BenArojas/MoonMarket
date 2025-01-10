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
from decouple import config


ENV_MODE = config("ENV_MODE")

if ENV_MODE == 'production':
    from app import api_app

    api_app.include_router(AuthRouter, prefix="/auth")
    # api_app.include_router(MailRouter, prefix="/mail")
    api_app.include_router(RegisterRouter, prefix="/register")
    api_app.include_router(UserRouter, prefix="/user")
    api_app.include_router(StockRouter, prefix="/stock")
    api_app.include_router(TransactionRouter, prefix="/transaction")
    api_app.include_router(PortfolioSnapshotRouter, prefix="/portfolio-snapshot")
    api_app.include_router(FriendsRouter, prefix="/friends")
    api_app.include_router(APIKeyRouter, prefix="/api-key")

if ENV_MODE == 'development':
    app.include_router(AuthRouter, prefix="/auth")
    # app.include_router(MailRouter, prefix="/mail")
    app.include_router(RegisterRouter, prefix="/register")
    app.include_router(UserRouter, prefix="/user")
    app.include_router(StockRouter, prefix="/stock")
    app.include_router(TransactionRouter, prefix="/transaction")
    app.include_router(PortfolioSnapshotRouter, prefix="/portfolio-snapshot")
    app.include_router(FriendsRouter, prefix="/friends")
    app.include_router(APIKeyRouter, prefix="/api-key")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
    

