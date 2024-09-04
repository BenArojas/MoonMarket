"""Server main runtime."""
import uvicorn
from app import app
from routes.auth import router as AuthRouter
from routes.mail import router as MailRouter
from routes.register import router as RegisterRouter
from routes.user import router as UserRouter
from routes.stock import router as StockRouter
from routes.transaction import router as TransactionRouter
from routes.PortfolioSnapshot import router as  PortfolioSnapshotRouter
from routes.friend import router as FriendsRouter

app.include_router(AuthRouter)
app.include_router(MailRouter)
app.include_router(RegisterRouter)
app.include_router(UserRouter)
app.include_router(StockRouter)
app.include_router(TransactionRouter)
app.include_router(PortfolioSnapshotRouter)
app.include_router(FriendsRouter)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",
        reload=True,
        port=8000,
    )
    

