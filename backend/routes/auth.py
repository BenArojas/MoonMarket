"""Authentication routes for FastAPI."""

from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, HTTPException, Security, Response, Depends
from fastapi.security import OAuth2PasswordRequestForm
from models.user import User
from utils.password import  verify_password
from utils.auth_user import get_current_user, EXPIRATION_TIME
from fastapi.responses import JSONResponse
from config import COOKIE_SECURE

router = APIRouter( tags=["Auth"])



@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Handle user login and create a new session."""
    user = await User.by_email(form_data.username)
    if user is None or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Bad email or password")

    # Use the create_session method from User model
    session_token = await user.create_session()
    session_created_at = datetime.now(timezone.utc)

    response = JSONResponse(content={"message": "Login successful"})
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        expires=session_created_at + EXPIRATION_TIME,
    )

    return response

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Handle user logout and end the session."""
    await current_user.end_session()
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("session")
    return response

@router.get("/protected-route")
async def protected_route(current_user: User = Depends(get_current_user)):
    """Example of a protected route that requires authentication."""
    return {
        "message": "This is a protected route", 
        "user": str(current_user.id), 
        "enabled": current_user.enabled
    }