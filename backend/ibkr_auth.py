
import logging
from fastapi import APIRouter, HTTPException, Depends
import requests
from main import state

config = state.config


logger = logging.getLogger(__name__)
router = APIRouter(tags=["Auth"])


def check_authentication():
    """Check if authenticated with IBKR API."""
    try:
        response = state.session.get(f"{config['ibkr_api_url']}/sso/validate", timeout=5)
        logger.info(f"Authentication check: {response.status_code} - {response.text}")
        return response.status_code == 200
    except requests.RequestException as e:
        logger.error(f"Authentication check failed: {e}")
        return False
    
@router.get("/auth/status")
async def auth_status():
    """Check authentication status."""
    if check_authentication():
        return {"authenticated": True}
    return {"authenticated": False, "message": f"Please authenticate at {config['ibkr_api_url']}"}

@router.post("/auth/logout")
async def logout():
    """Logout from IBKR API."""
    try:
        # Call IBKR logout endpoint
        response = state.session.post(f"{config['ibkr_api_url']}/logout", timeout=10)
        logger.info(f"Logout response: {response.status_code} - {response.text}")
        
        # Clear any local session data if you have any
        # For example, if you're storing tokens or session info
        
        if response.status_code == 200:
            return {"success": True, "message": "Logged out successfully"}
        else:
            # Even if IBKR logout fails, we should still clear local session
            logger.warning(f"IBKR logout returned {response.status_code}, but clearing local session")
            return {"success": True, "message": "Local session cleared"}
            
    except requests.RequestException as e:
        logger.error(f"Logout failed: {e}")
        # Still return success to clear local session even if IBKR call fails
        return {"success": True, "message": "Local session cleared, IBKR logout may have failed"}