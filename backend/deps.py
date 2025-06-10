# deps.py ---------------------------------------------------------------
from fastapi import Request
from ibkr_service import IBKRService

def get_ibkr_service(request: Request) -> IBKRService:
    """
    Pull the singleton instance that main.py stashed on app.state.
    """
    return request.app.state.ibkr
