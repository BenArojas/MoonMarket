"""Current user dependency."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from models.user import User
from fastapi import HTTPException, Cookie, Request

EXPIRATION_TIME = timedelta(hours=1)  # 1 hour

async def get_current_user(request: Request,session: Optional[str] = Cookie(None)) -> User:
    """Dependency to get the current authenticated user from session cookie."""
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Use the by_session class method from User model
    user = await User.by_session(session, request)
    if not user or not user.last_activity:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Ensure timezone awareness
    user_last_activity = (
        user.last_activity.replace(tzinfo=timezone.utc) 
        if user.last_activity.tzinfo is None 
        else user.last_activity
    )

    # Check session expiration
    if datetime.now(timezone.utc) > user_last_activity + EXPIRATION_TIME:
        await user.end_session()  # Clean up expired session
        raise HTTPException(status_code=401, detail="Session expired")

    # Update last activity timestamp using the model method
    await user.update_last_activity(request)
    
    return user


# Optional: Add session cleanup utility
async def cleanup_expired_sessions():
    """Utility function to clean up expired sessions."""
    expiration_threshold = datetime.now(timezone.utc) - EXPIRATION_TIME
    users_with_expired_sessions = await User.find(
        {
            "session": {"$ne": None},
            "last_activity": {"$lt": expiration_threshold}
        }
    ).to_list()
    
    for user in users_with_expired_sessions:
        await user.end_session()