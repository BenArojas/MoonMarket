"""JWT authentication system for FastAPI."""

from datetime import datetime, timedelta
from typing import Optional
import secrets
from fastapi import HTTPException, Security, Cookie, Response
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from models.user import User

# Configuration
SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Cookie settings
COOKIE_SETTINGS = {
    "httponly": True,  # Prevents JavaScript access
    "secure": True,    # Only sent over HTTPS
    "samesite": 'lax', # CSRF protection
    "path": "/"        # Cookie is valid for all paths
}

def create_token(data: dict, expires_delta: timedelta) -> str:
    """Create a JWT token with expiration."""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_access_token(email: str) -> str:
    """Create an access token."""
    return create_token(
        {"sub": email},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

def create_refresh_token(email: str) -> str:
    """Create a refresh token."""
    return create_token(
        {"sub": email},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

async def verify_token(token: str) -> Optional[str]:
    """Verify a token and return the email if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None

async def get_current_user(
    access_token: str = Cookie(None, alias="access_token")
) -> User:
    """Get the current user from the access token cookie."""
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )
    
    email = await verify_token(access_token)
    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid token or expired token",
        )
    
    user = await User.by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set authentication cookies in the response."""
    response.set_cookie(
        "access_token",
        access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_SETTINGS
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        **COOKIE_SETTINGS
    )

def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")