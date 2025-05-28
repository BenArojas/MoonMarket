import logging
from fastapi import APIRouter, Depends, HTTPException
import httpx
from app import AppState, get_app_state

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Auth"])


async def check_authentication(state:AppState):
    """Check if authenticated with IBKR API."""
    try:
        response = await state.client.get(f"{state.config['ibkr_api_url']}/sso/validate", timeout=5)
        logger.info(f"Authentication check: {response.status_code} - {response.text}")
        return response.status_code == 200
    except httpx.RequestError as e:
        logger.error(f"Authentication check failed: {e}")
        return False

@router.get("/auth/status")
async def auth_status(state: AppState = Depends(get_app_state)):
    """Check authentication status and return detailed info."""
    
    if await check_authentication(state):
        # Get additional auth details
        try:
            tickle_response = await state.client.post(f"{state.config['ibkr_api_url']}/tickle", timeout=5)
            if tickle_response.status_code == 200:
                auth_data = await tickle_response.json()
                return {
                    "authenticated": True,
                    "session_active": True,
                    "session_id": auth_data.get("session", "")[:8] + "..." if auth_data.get("session") else "unknown",
                    "user_id": auth_data.get("userId", "unknown"),
                    "iserver_status": auth_data.get("iserver", {}).get("authStatus", {}),
                    "websocket_ready": bool(state.ibkr_session_token)
                }
            else:
                return {
                    "authenticated": True,
                    "session_active": False,
                    "message": "Authentication valid but session may be inactive"
                }
        except Exception as e:
            logger.error(f"Error getting detailed auth status: {e}")
            return {
                "authenticated": True,
                "session_active": False,
                "error": str(e)
            }
    else:
        return {
            "authenticated": False, 
            "message": f"Please authenticate at {state.config['ibkr_api_url']}"
        }

@router.post("/auth/reauthenticate")
async def reauthenticate(state: AppState = Depends(get_app_state)):
    """Force a reauthentication attempt."""
    
    try:
        # Try to tickle the session to reactivate it
        response = await state.client.post(f"{state.config['ibkr_api_url']}/tickle", timeout=10)
        
        if response.status_code == 200:
            session_data = await response.json()
            if session_data.get("session"):
                state.ibkr_session_token = session_data["session"]
                logger.info("Reauthentication successful")
                return {
                    "success": True,
                    "message": "Session reactivated successfully",
                    "session_id": session_data["session"][:8] + "..."
                }
            else:
                logger.warning("Tickle successful but no session token received")
                return {
                    "success": False,
                    "message": "Session reactivation incomplete - no token received"
                }
        else:
            logger.error(f"Reauthentication failed: {response.status_code} - {response.text}")
            return {
                "success": False,
                "message": f"Reauthentication failed: {response.status_code}",
                "details": response.text
            }
            
    except httpx.RequestError as e:
        logger.error(f"Reauthentication request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reauthentication failed: {str(e)}")

@router.get("/auth/accounts")
async def get_accounts(state: AppState = Depends(get_app_state)):
    """Get available trading accounts."""
    
    if not await check_authentication():
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        response = await state.client.get(f"{state.config['ibkr_api_url']}/portfolio/accounts", timeout=10)
        response.raise_for_status()
        
        accounts = await response.json()
        
        # Update the global account ID if we don't have one
        if accounts and not state.account_id:
            # Use the first account as default
            first_account = accounts[0]
            if isinstance(first_account, dict):
                state.account_id = first_account.get("accountId") or first_account.get("id")
            else:
                state.account_id = str(first_account)
            logger.info(f"Set default account ID: {state.account_id}")
        
        return {
            "success": True,
            "accounts": accounts,
            "current_account": state.account_id
        }
        
    except httpx.RequestError as e:
        logger.error(f"Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

@router.post("/auth/set-account/{account_id}")
async def set_account(account_id: str, state: AppState = Depends(get_app_state)):
    """Set the active trading account."""
    
    if not await check_authentication():
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate account exists
    try:
        response = await state.client.get(f"{state.config['ibkr_api_url']}/portfolio/accounts", timeout=10)
        response.raise_for_status()
        
        accounts = await response.json()
        account_ids = []
        
        for account in accounts:
            if isinstance(account, dict):
                acc_id = account.get("accountId") or account.get("id")
            else:
                acc_id = str(account)
            account_ids.append(acc_id)
        
        if account_id not in account_ids:
            raise HTTPException(status_code=400, detail=f"Account {account_id} not found. Available: {account_ids}")
        
        # Set the account
        state.account_id = account_id
        logger.info(f"Account set to: {account_id}")
        
        return {
            "success": True,
            "message": f"Account set to {account_id}",
            "account_id": account_id
        }
        
    except httpx.RequestError as e:
        logger.error(f"Error setting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set account: {str(e)}")

@router.get("/auth/session-info")
async def get_session_info(state: AppState = Depends(get_app_state)):
    """Get detailed session information."""
    
    try:
        response = await state.client.post(f"{state.config['ibkr_api_url']}/tickle", timeout=5)
        
        if response.status_code == 200:
            session_data = await response.json()
            return {
                "success": True,
                "session_data": session_data,
                "websocket_token": state.ibkr_session_token[:8] + "..." if state.ibkr_session_token else None,
                "current_account": state.account_id
            }
        else:
            return {
                "success": False,
                "status_code": response.status_code,
                "message": response.text
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error getting session info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session info: {str(e)}")

@router.post("/auth/logout")
async def logout(state: AppState = Depends(get_app_state)):
    """Logout from IBKR session."""
    
    try:
        response = await state.client.post(f"{state.config['ibkr_api_url']}/logout", timeout=10)
        
        # Clear local session data
        state.ibkr_session_token = None
        state.account_id = None
        state.holdings.clear()
        state.account_summary.clear()
        state.subscribed_conids.clear()
        
        # Close WebSocket connection
        if state.ibkr_ws:
            state.ibkr_ws.close()
            state.ibkr_ws = None
        
        logger.info("Logged out successfully")
        
        return {
            "success": True,
            "message": "Logged out successfully",
            "ibkr_response": response.text if response.status_code == 200 else None
        }
        
    except httpx.RequestError as e:
        logger.error(f"Error during logout: {e}")
        # Still clear local data even if IBKR logout fails
        state.ibkr_session_token = None
        state.account_id = None
        state.holdings.clear()
        state.account_summary.clear()
        
        return {
            "success": True,
            "message": "Local session cleared (IBKR logout may have failed)",
            "error": str(e)
        }