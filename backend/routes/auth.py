"""Authentication routes for FastAPI."""

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from models.user import User
from util.password import verify_password

from jwt import (
    create_access_token,
    create_refresh_token,
    verify_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user
)

router = APIRouter(tags=["Auth"])

@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login route that sets JWT cookies."""
    user = await User.by_email(form_data.username)
    if user is None or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(user.email)
    refresh_token = create_refresh_token(user.email)
    
    response = JSONResponse(content={"message": "Login successful"})
    set_auth_cookies(response, access_token, refresh_token)
    
    return response

@router.post("/refresh")
async def refresh(
    response: Response,
    refresh_token: str = Cookie(None)
):
    """Refresh access token using refresh token."""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    email = await verify_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    new_access_token = create_access_token(email)
    
    response = JSONResponse(content={"message": "Token refreshed successfully"})
    response.set_cookie(
        "access_token",
        new_access_token,
        max_age=15 * 60,  # 15 minutes
        httponly=True,
        secure=True,
        samesite='lax'
    )
    
    return response

@router.post("/logout")
async def logout(response: Response):
    """Logout route that clears JWT cookies."""
    response = JSONResponse(content={"message": "Logged out successfully"})
    clear_auth_cookies(response)
    return response

@router.get("/protected-route")
async def protected_route(current_user: User = Depends(get_current_user)):
    """Example protected route that requires authentication."""
    return {
        "message": "This is a protected route",
        "user": str(current_user.id),
        "enabled": current_user.enabled
    }