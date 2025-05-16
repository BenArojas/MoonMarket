"""Cache manager for handling Redis operations."""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, TYPE_CHECKING
from cache.utils import convert_datetime_recursive
from fastapi import Request
import json
import pytz
if TYPE_CHECKING:
    from models.user import User
    from models.APIKeyManager import ApiKey

class CacheManager:
    """Manages Redis caching operations with write-behind strategy."""
    
    def __init__(self, request: Request):
        """Initialize cache manager with Redis client from FastAPI request state."""
        self.redis = request.app.state.redis
        self.prefix = {
            "user": "user:",
            "api_key": "api_key:",
            "session": "session:"
        } 
    
    # ----- Session Management Methods -----
    
    async def get_user_by_session(self, session: str) -> Optional[dict]:
        """Retrieve user data from cache by session."""
        cache_key = f"{self.prefix['user']}session:{session}" 
        data = await self.redis.get(cache_key)
        return json.loads(data) if data else None
    
    async def create_session(self, user: "User", ttl: int = 3600) -> None:
        """Create a new session in Redis for the user."""
        if not user.session:
            return
            
        # Store session metadata
        session_key = f"{self.prefix['session']}{user.session}"
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        
        await self.redis.setex(
            session_key,
            ttl,
            json.dumps({"expires_at": expires_at.isoformat()})
        )
        
        # Also cache the user data
        await self.cache_user(user, expire=ttl)
    
    async def get_session_data(self, session: str) -> Optional[dict]:
        """Retrieve session metadata from Redis."""
        cache_key = f"{self.prefix['session']}{session}"
        data = await self.redis.get(cache_key)
        if data:
            session_data = json.loads(data)
            session_data["expires_at"] = datetime.fromisoformat(session_data["expires_at"])
            return session_data
        return None
    
    async def extend_session(self, session: str, ttl: int = 3600) -> None:
        """Extend session TTL in Redis."""
        cache_key = f"{self.prefix['session']}{session}"
        session_data = await self.get_session_data(session)
        if session_data:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
            await self.redis.setex(
                cache_key,
                ttl,
                json.dumps({"expires_at": expires_at.isoformat()})
            )
    
    async def invalidate_session(self, session: str) -> None:
        """Invalidate session in Redis."""
        # Remove session metadata
        session_key = f"{self.prefix['session']}{session}"
        await self.redis.delete(session_key)
        
        # Remove cached user data associated with this session
        user_key = f"{self.prefix['user']}session:{session}"
        await self.redis.delete(user_key)
    
    # ----- User Management Methods -----
    
    async def cache_user(self, user: "User", expire: int = 3600) -> None:
        """Cache user data using CachedUser model."""
        # Only proceed if user has a session
        if not user.session:
            return
            
        cache_key = f"{self.prefix['user']}session:{user.session}"
            
        # Convert user to dict, excluding sensitive data
        user_dict = user.model_dump()
        
        serialized_data = convert_datetime_recursive(user_dict)
        
        # Store in Redis with expiration
        await self.redis.setex(
            cache_key,
            expire,
            json.dumps(serialized_data)
        )
    
    async def invalidate_user(self, user: "User") -> None:
        """
        Remove all cached entries for a user.
        Called when user data is updated or session ends.
        """
        if user.session:
            cache_key = f"{self.prefix['user']}session:{user.session}"
            await self.redis.delete(cache_key)
    
    # ----- API Key Management Methods -----
    
    async def get_api_key(self, key: str) -> Optional[dict]:
        """
        Retrieve API key data from cache. This method is used when we know the exact key
        we want to retrieve, typically during validation.
        """
        cache_key = f"{self.prefix['api_key']}key:{key}"
        data = await self.redis.get(cache_key)
        return json.loads(data) if data else None
    
    async def get_available_keys(self) -> Optional[list]:
        """
        Retrieve the list of available API keys from cache. This is used when we need
        to find an available key for use.
        """
        cache_key = f"{self.prefix['api_key']}available"
        data = await self.redis.get(cache_key)
        return json.loads(data) if data else None
    
    async def cache_api_key(self, api_key: "ApiKey", expire: int = 300) -> None:
        """
        Cache individual API key data. We use a shorter expiration time (5 minutes default)
        for API keys since their usage stats change frequently.
        """
        # Convert datetime objects to strings for JSON serialization
        api_key_dict = {
            "key": api_key.key,
            "rate_limit": api_key.rate_limit,
            "requests": api_key.requests,
            "next_reset": api_key.next_reset.isoformat(),
            "last_used": api_key.last_used.isoformat() if api_key.last_used else None,
            "is_active": api_key.is_active
        }
        
        # Cache individual key data
        key_cache_key = f"{self.prefix['api_key']}key:{api_key.key}"
        await self.redis.setex(key_cache_key, expire, json.dumps(api_key_dict))
        
    async def cache_available_keys(self, api_keys: list["ApiKey"], expire: int = 60) -> None:
        """
        Cache the list of available API keys. We use a very short expiration time (1 minute default)
        since availability can change quickly.
        """
        available_keys = []
        now = datetime.now(pytz.UTC)
        
        for key in api_keys:
            # Only include keys that are active and under rate limit
            if key.is_active and key.requests < key.rate_limit:
                next_reset = key.next_reset
                if next_reset.tzinfo is None:
                    next_reset = pytz.UTC.localize(next_reset)
                if now >= next_reset:
                    # Key should be reset
                    key_dict = key.model_dump()  # Use model_dump() instead of dict()
                    key_dict['requests'] = 0
                else:
                    key_dict = key.model_dump()  # Use model_dump() instead of dict()
                
                # Convert datetime objects to ISO format strings
                key_dict = convert_datetime_recursive(key_dict)
                available_keys.append(key_dict)
        
        if available_keys:
            cache_key = f"{self.prefix['api_key']}available"
            await self.redis.setex(cache_key, expire, json.dumps(available_keys))
            
    async def invalidate_api_key(self, api_key: "ApiKey") -> None:
        """
        Remove API key from cache. Called when the key's data is updated.
        """
        keys_to_delete = [
            f"{self.prefix['api_key']}key:{api_key.key}",
            f"{self.prefix['api_key']}available"  # Also invalidate available keys list
        ]
        await self.redis.delete(*keys_to_delete)
        
    async def increment_api_key_usage(self, api_key: "ApiKey") -> None:
        """
        Increment the usage count in cache immediately, then update database.
        This provides immediate rate limiting while maintaining data consistency.
        """
        cache_key = f"{self.prefix['api_key']}key:{api_key.key}"
        cached_data = await self.get_api_key(api_key.key)
        
        if cached_data:
            cached_data['requests'] += 1
            cached_data['last_used'] = datetime.now().isoformat()
            await self.redis.setex(cache_key, 300, json.dumps(cached_data))
            
    # ----- Stock Data Methods -----
            
    async def get_historical_stock_data_for_ticker(self, ticker: str, time_range: str, metrics: list) -> Optional[dict]:
        """Retrieve historical stock data for a single ticker from cache."""
        cache_key = f"stock:historical:{ticker}:{time_range}:{','.join(metrics)}"
        data = await self.redis.get(cache_key)
        return json.loads(data) if data else None

    async def cache_historical_stock_data_for_ticker(self, ticker: str, time_range: str, metrics: list, data: dict, expire: int) -> None:
        """Cache historical stock data for a single ticker."""
        cache_key = f"stock:historical:{ticker}:{time_range}:{','.join(metrics)}"
        await self.redis.setex(cache_key, expire, json.dumps(data))