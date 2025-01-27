# """Email router."""

# from datetime import datetime, timezone

# from fastapi import APIRouter, HTTPException, Response
# from models.user import User
# # from utils.mail import send_verification_email


# router = APIRouter( tags=["Mail"])


# @router.post("/verify")
# async def request_verification_email(
#     email: EmailStr = Body(..., embed=True)
# ) -> Response:
#     """Send the user a verification email."""
#     user = await User.by_email(email)
#     if user is None:
#         raise HTTPException(404, "No user found with that email")
#     if user.email_confirmed_at is not None:
#         raise HTTPException(400, "Email is already verified")
#     if user.disabled:
#         raise HTTPException(400, "Your account is disabled")
#     token = access_security.create_access_token(user.jwt_subject)
#     await send_verification_email(email, token)
#     return Response(status_code=200)


# @router.post("/verify/{token}", operation_id="verify_email_with_token")
# async def verify_email(token: str) -> Response:
#     """Verify the user's email with the supplied token."""
#     user = await user_from_token(token)
#     if user is None:
#         raise HTTPException(404, "No user found with that email")
#     if user.email_confirmed_at is not None:
#         raise HTTPException(400, "Email is already verified")
#     if user.disabled:
#         raise HTTPException(400, "Your account is disabled")
#     user.email_confirmed_at = datetime.now(tz=timezone.utc)
#     await user.save()
#     return Response(status_code=200)
# @router.post("/verify/{token}", operation_id="verify_email_with_token")
# async def verify_email(token: str) -> Response:
#     """Verify the user's email with the supplied token."""
#     user = await user_from_token(token)
#     if user is None:
#         raise HTTPException(404, "No user found with that email")
#     if user.email_confirmed_at is not None:
#         raise HTTPException(400, "Email is already verified")
#     if user.disabled:
#         raise HTTPException(400, "Your account is disabled")
#     user.email_confirmed_at = datetime.now(tz=timezone.utc)
#     await user.save()
#     return Response(status_code=200)