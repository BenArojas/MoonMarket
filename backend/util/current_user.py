"""Current user dependency."""

from fastapi import HTTPException, Security, FastAPI, Depends, Cookie
from typing import Optional
from fastapi_jwt import JwtAuthorizationCredentials

from models.user import User
from jwt import access_security, user_from_credentials


async def current_user(
    credentials: JwtAuthorizationCredentials = Security(access_security)
):
    """Return the current authorized user."""
    if not credentials:
        raise HTTPException(401, "No authorization credentials found")
    user = await user_from_credentials(credentials)
    if user is None:
        raise HTTPException(404, "Authorized user could not be found")
    return user

