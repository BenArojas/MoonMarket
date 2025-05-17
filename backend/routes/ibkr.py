# from datetime import datetime, timedelta
# import secrets
# from urllib.parse import urlencode
# from fastapi.responses import RedirectResponse
# from fastapi import APIRouter, Depends, HTTPException, Request
# import httpx

# from models.user import ApiProvider, User
# from utils.auth_user import get_current_user

# # Store these securely, e.g., in environment variables or a config service
# IBKR_CLIENT_ID = "YOUR_IBKR_CLIENT_ID"
# IBKR_REDIRECT_URI = "YOUR_BACKEND_HTTPS_CALLBACK_URL" # e.g., https://yourapi.com/auth/ibkr/callback
# IBKR_AUTHORIZATION_URL = "https://www.interactivebrokers.com/sso/oauth" # Verify this
# IBKR_CLIENT_SECRET = "YOUR_IBKR_CLIENT_SECRET"
# IBKR_TOKEN_URL = "https://api.ibkr.com/v1/api/oauth/token" # Verify this

# router = APIRouter(tags=["Ibkr"])

# @router.get("/auth/ibkr/login")
# async def ibkr_login(request_fastapi: Request): # FastAPI Request object to access session
#     state = secrets.token_urlsafe(16)
#     # Store state in user's session to verify it on callback (CSRF protection)
#     request_fastapi.session["oauth_state"] = state 
    
#     params = {
#         "client_id": IBKR_CLIENT_ID,
#         "response_type": "code",
#         "scope": "openid profile financial_info account_read", # Adjust scopes as needed: e.g. openid, profile, account_read, trading etc.
#         "redirect_uri": IBKR_REDIRECT_URI,
#         "state": state,
#     }
#     authorization_redirect_url = f"{IBKR_AUTHORIZATION_URL}?{urlencode(params)}"
#     return RedirectResponse(url=authorization_redirect_url)


# @router.get("/auth/ibkr/callback")
# async def ibkr_callback(
#     code: str, 
#     state: str, 
#     request_fastapi: Request, # FastAPI Request for session
#     user: User = Depends(get_current_user) # Get current logged-in user
# ):
#     # 1. Verify State (CSRF Protection)
#     expected_state = request_fastapi.session.pop("oauth_state", None)
#     if not expected_state or expected_state != state:
#         raise HTTPException(status_code=400, detail="Invalid OAuth state or state missing")

#     # 2. Exchange Authorization Code for Tokens
#     token_payload = {
#         "grant_type": "authorization_code",
#         "code": code,
#         "redirect_uri": IBKR_REDIRECT_URI, # Must match the one used in the auth request
#         # For private_key_jwt, you'd use client_assertion instead of client_secret
#     }
    
#     # Basic Auth for client_id and client_secret (common for OAuth)
#     # Some providers might use client_secret_post instead. Check IBKR docs.
#     auth = (IBKR_CLIENT_ID, IBKR_CLIENT_SECRET)

#     async with httpx.AsyncClient() as client:
#         try:
#             token_response = await client.post(
#                 IBKR_TOKEN_URL, 
#                 data=token_payload,
#                 auth=auth # If IBKR expects client_id/secret in Authorization header (Basic Auth)
#                 # If IBKR expects client_id/secret in body:
#                 # data={**token_payload, "client_id": IBKR_CLIENT_ID, "client_secret": IBKR_CLIENT_SECRET}
#             )
#             token_response.raise_for_status() # Raise an exception for HTTP 4xx or 5xx
#             token_data = token_response.json()
#         except httpx.HTTPStatusError as e:
#             # Log the error details from e.response.text
#             print(f"Token exchange error: {e.response.text}")
#             raise HTTPException(status_code=400, detail=f"Failed to obtain token from IBKR: {e.response.status_code}")
#         except Exception as e:
#             print(f"Generic token exchange error: {e}")
#             raise HTTPException(status_code=500, detail="An error occurred during IBKR token exchange.")

#     access_token = token_data.get("access_token")
#     refresh_token = token_data.get("refresh_token")
#     expires_in = token_data.get("expires_in") # Seconds

#     if not access_token:
#         raise HTTPException(status_code=400, detail="IBKR did not return an access token.")

#     # 3. Store Tokens Securely in User Document (Encrypted!)
#     # user.ibkr_access_token = cipher_suite.encrypt(access_token.encode()).decode()
#     # if refresh_token:
#     #    user.ibkr_refresh_token = cipher_suite.encrypt(refresh_token.encode()).decode()
#     # if expires_in:
#     #    user.ibkr_token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    
#     # For now, storing plainly (NOT RECOMMENDED FOR PRODUCTION)
#     user.ibkr_access_token_placeholder = access_token # Replace with encrypted storage
#     if refresh_token:
#         user.ibkr_refresh_token_placeholder = refresh_token # Replace
#     if expires_in:
#         user.ibkr_token_expiry_placeholder = datetime.utcnow() + timedelta(seconds=expires_in) # Replace
    
#     user.ibkr_is_connected_placeholder = True # This should be a real field
#     user.api_provider = ApiProvider.IBKR # Explicitly set provider
    
#     # If this callback also means the account is "enabled" for basic use:
#     # user.enabled = True # Or this is done in the /complete-setup if tax is still pending
    
#     await user.save()

#     # 4. Redirect User back to Frontend
#     # To the page where they can complete tax setup or to their dashboard
#     frontend_redirect_url = "https://yourfrontend.com/account-setup?ibkr_connected=true" # Or similar
#     return RedirectResponse(url=frontend_redirect_url)

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
import httpx
from models.user import ApiProvider, User
from utils.auth_user import get_current_user

router = APIRouter(tags=["Ibkr"])

GATEWAY_URL = "https://localhost:5055"  # Adjust to your Gateway port

@router.get("/auth/ibkr/verify")
async def verify_ibkr_connection(user: User = Depends(get_current_user)):
    async with httpx.AsyncClient(verify=False) as client:  # Ignore self-signed SSL for localhost
        try:
            response = await client.get(f"{GATEWAY_URL}/v1/api/iserver/auth/status")
            response.raise_for_status()
            status_data = response.json()
            is_authenticated = status_data.get("authenticated", False)
            if is_authenticated:
                user.ibkr_is_connected = True
                user.ibkr_last_verified = datetime.utcnow()
                # user.api_provider = ApiProvider.IBKR
                await user.save()
                return {"isAuthenticated": True}
            else:
                return {"isAuthenticated": False}
        except httpx.HTTPError as e:
            print(f"Verification error: {e}")
            return {"isAuthenticated": False}
        
@router.get("/ibkr/{endpoint:path}")
async def proxy_ibkr_request(endpoint: str, user: User = Depends(get_current_user)):
    if not user.ibkr_is_connected:
        raise HTTPException(status_code=401, detail="IBKR not connected")
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.get(f"{GATEWAY_URL}/v1/api/{endpoint}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        
#frontend example
# const fetchPortfolio = async () => {
#     try {
#         const response = await fetch('/api/ibkr/portfolio/accounts', {
#             credentials: 'include',
#         });
#         const data = await response.json();
#         console.log("Portfolio:", data);
#     } catch (error) {
#         toast.error("Failed to fetch portfolio data.");
#     }
# };