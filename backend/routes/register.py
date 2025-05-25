"""Registration router."""

from fastapi import APIRouter, HTTPException
from models.user import User, UserRegister
from utils.password import hash_password

router = APIRouter( tags=["Register"])

# embed = Body(..., embed=True)


@router.post("", response_model=UserRegister)
async def user_registration(user_register: UserRegister):  
    """Create a new user."""
    email_check = await User.by_email(user_register.email) 
    if email_check is not None:
        raise HTTPException(409, "User with that email already exists")
    username_check = await User.by_username(user_register.username)
    if username_check is not None:
        raise HTTPException(409, "User with that username already exists")

    hashed = hash_password(user_register.password)
    user = User(
        email=user_register.email, 
        password=hashed, 
        username=user_register.username,
        account_type='free'
    )
    await user.create()
    return user


# @router.post("/forgot-password")
# async def forgot_password(email: EmailStr = embed) -> Response:
#     """Send password reset email."""
#     user = await User.by_email(email)
#     if user is None:
#         raise HTTPException(404, "No user found with that email")
#     if user.email_confirmed_at is not None:
#         raise HTTPException(400, "Email is already verified")
#     if user.disabled:
#         raise HTTPException(400, "Your account is disabled")
#     token = access_security.create_access_token(user.jwt_subject)
#     await send_password_reset_email(email, token)
#     return Response(status_code=200)


# @router.post("/reset-password/{token}", response_model=UserOut)
# async def reset_password(token: str, password: str = embed):  # type: ignore[no-untyped-def]
#     """Reset user password from token value."""
#     user = await user_from_token(token)
#     if user is None:
#         raise HTTPException(404, "No user found with that email")
#     if user.email_confirmed_at is None:
#         raise HTTPException(400, "Email is not yet verified")
#     if user.disabled:
#         raise HTTPException(400, "Your account is disabled")
#     user.password = hash_password(password)
#     await user.save()
#     return user