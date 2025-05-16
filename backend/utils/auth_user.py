"""Current user dependency."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from cache.manager import CacheManager
from models.user import User
from fastapi import HTTPException, Cookie, Request

EXPIRATION_TIME = timedelta(hours=1)  # 1 hour

async def get_current_user(request: Request, session: Optional[str] = Cookie(None)) -> User:
    """Dependency to get the current authenticated user from session cookie."""
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    cache_manager = CacheManager(request)
    session_data = await cache_manager.get_session_data(session)
    
    if not session_data:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check expiration (stored in Redis)
    if session_data["expires_at"] < datetime.now(timezone.utc):
        await cache_manager.invalidate_session(session)
        raise HTTPException(status_code=401, detail="Session expired")

    # Get or fetch user
    user = await User.by_session(session, request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Extend session in Redis (no DB update needed)
    await cache_manager.extend_session(session)
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
        
