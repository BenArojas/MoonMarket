"""Authentication router."""

from fastapi import APIRouter, HTTPException, Security, Response, Depends
from fastapi_jwt import JwtAuthorizationCredentials
from fastapi.security import OAuth2PasswordRequestForm
from models.user import User
from jwt import access_security, refresh_security
from util.password import  verify_password
from util.current_user import current_user
from fastapi.responses import JSONResponse

router = APIRouter( tags=["Auth"])


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await User.by_email(form_data.username)
    if user is None or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Bad email or password")
    
    access_token = access_security.create_access_token(user.jwt_subject)
    refresh_token = refresh_security.create_refresh_token(user.jwt_subject)
    
    response = JSONResponse(content={"message": "Login successful"})
    access_security.set_access_cookie(response, access_token)
    refresh_security.set_refresh_cookie(response, refresh_token)

    return response


@router.post("/refresh")
async def refresh(response: Response, credentials: JwtAuthorizationCredentials = Security(refresh_security)):
    new_access_token = access_security.create_access_token(subject=credentials.subject)
    response = JSONResponse(content={"message": "Token refreshed successfully"})
    access_security.set_access_cookie(response, new_access_token)
    return response


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token_cookie")
    response.delete_cookie("refresh_token_cookie")
    return {"message": "Logged out successfully"}


@router.get("/protected-route")
async def protected_route(current_user: User = Depends(current_user)):
    return {"message": "This is a protected route", "user": str(current_user.id), "enabled": current_user.enabled}