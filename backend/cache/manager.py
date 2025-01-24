"""Cache manager for handling Redis operations."""
from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING
from fastapi import Request
import json
import pytz
from models.schemas import CachedUser, Deposit, Holding, YearlyExpenses
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
            "api_key": "api_key:"
        } 
    
    async def get_user_by_session(self, session: str) -> Optional[dict]:
        """Retrieve user data from cache by session."""
        cache_key = f"{self.prefix['user']}session:{session}" 
        data = await self.redis.get(cache_key)
        return json.loads(data) if data else None
    
    async def cache_user(self, user: "User", expire: int = 3600) -> None:
        """Cache user data using CachedUser model."""
        # Convert to CachedUser first
        cached_user = CachedUser.from_user(user)
        user_dict = cached_user.model_dump()
        
        # Convert datetime objects to ISO format
        if user_dict.get('last_activity'):
            user_dict['last_activity'] = user_dict['last_activity'].isoformat()
        if user_dict.get('last_refresh'):
            user_dict['last_refresh'] = user_dict['last_refresh'].isoformat()
        
        if user_dict.get('deposits'):
            user_dict['deposits'] = [
                deposit.model_dump() if isinstance(deposit, Deposit) else deposit 
                for deposit in user_dict['deposits']
            ]
                    
        # Handle holdings list
        if user_dict.get('holdings'):
            user_dict['holdings'] = [
                holding.model_dump() if isinstance(holding, Holding) else holding 
                for holding in user_dict['holdings']
            ]
        
        if user_dict.get('yearly_expenses'):
            user_dict['yearly_expenses'] = [
                expense.model_dump() if isinstance(expense, YearlyExpenses) else expense 
                for expense in user_dict['yearly_expenses']
            ]

        # Cache by session if available
        if user.session:
            session_key = f"{self.prefix['user']}session:{user.session}"
            await self.redis.setex(session_key, expire, json.dumps(user_dict))
        
        # Cache by email and username
        email_key = f"{self.prefix['user']}email:{user.email}"
        username_key = f"{self.prefix['user']}username:{user.username}"
        await self.redis.setex(email_key, expire, json.dumps(user_dict))
        await self.redis.setex(username_key, expire, json.dumps(user_dict))
    
    async def invalidate_user(self, user: "User") -> None:
        """
        Remove all cached entries for a user.
        Called when user data is updated or session ends.
        """
        keys_to_delete = [
            f"{self.prefix}session:{user.session}" if user.session else None,
            f"{self.prefix}email:{user.email}",
            f"{self.prefix}username:{user.username}"
        ]
        keys_to_delete = [k for k in keys_to_delete if k is not None]
        if keys_to_delete:
            await self.redis.delete(*keys_to_delete)
    
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
                    key_dict = key.dict()
                    key_dict['requests'] = 0
                else:
                    key_dict = key.dict()
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