from datetime import datetime, timedelta, time
import random
from typing import Optional, Annotated
import pytz
from cache.manager import CacheManager
from fastapi import Request
from beanie import Document, Indexed
from pydantic import SecretStr, Field

def get_next_midnight_in_israel() -> datetime:
    israel_tz = pytz.timezone('Asia/Jerusalem')
    current_time_in_israel = datetime.now(israel_tz)
    
    # Set time to midnight (00:00)
    next_midnight = current_time_in_israel.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # If current time is past midnight (meaning we are already in the day), move to the next day's midnight
    if current_time_in_israel.hour >= 0:
        next_midnight += timedelta(days=1)
    
    # Convert to UTC before returning
    return next_midnight.astimezone(pytz.UTC)

class ApiKey(Document):
    """API Key DB representation."""

    key: Annotated[str, Indexed(unique=True)]
    rate_limit: int = Field(default=230)
    requests: int = Field(default=0)
    next_reset: datetime = Field(default_factory=get_next_midnight_in_israel)
    last_used: Optional[datetime] = None
    is_active: bool = Field(default=True)

    @property
    async def is_available(self) -> bool:
        now = datetime.now(pytz.UTC)  # Make now timezone-aware
        
        # Ensure next_reset is timezone-aware
        next_reset = self.next_reset
        if next_reset.tzinfo is None:
            next_reset = pytz.UTC.localize(next_reset)
            
        if now >= next_reset:
            await self.reset_usage(now)
        return self.requests < self.rate_limit and self.is_active

    async def reset_usage(self, now: datetime, request: Optional[Request] = None):
        """Reset API key usage with cache update."""
        self.requests = 0
        self.next_reset = self.get_next_reset(now)
        await self.save()
        
        if request:
            cache_manager = CacheManager(request)
            await cache_manager.invalidate_api_key(self)
            await cache_manager.cache_api_key(self)
            
    @staticmethod
    def get_next_reset(from_time: datetime) -> datetime:
        # Ensure from_time is timezone-aware
        if from_time.tzinfo is None:
            from_time = pytz.UTC.localize(from_time)
            
        next_day = from_time.date() + timedelta(days=1)
        # Create timezone-aware datetime for next reset
        next_reset = datetime.combine(next_day, time.min)
        return pytz.UTC.localize(next_reset)
    
    async def increment_usage(self, request: Request):
        """Increment usage with cache update."""
        self.requests += 1
        self.last_used = datetime.now(pytz.UTC)
        
        # Update cache first for immediate rate limiting
        cache_manager = CacheManager(request)
        await cache_manager.increment_api_key_usage(self)
        
        # Then update database
        await self.save()

    @classmethod
    async def get_available_key(cls, request: Request) -> Optional["ApiKey"]:
        """Get available API key with caching."""
        cache_manager = CacheManager(request)
        
        # Try to get available keys from cache
        cached_keys = await cache_manager.get_available_keys()
        if cached_keys:
            # Convert cached data back to ApiKey instances and handle datetime fields
            valid_keys = []
            for key_data in cached_keys:
                # Convert ISO format strings back to datetime objects
                if 'next_reset' in key_data:
                    key_data['next_reset'] = datetime.fromisoformat(key_data['next_reset'])
                # Add any other datetime fields that need conversion
                
                valid_keys.append(cls(**key_data))
            return random.choice(valid_keys) if valid_keys else None
        
        # If not in cache, query database
        available_keys = await cls.find(cls.is_active == True).to_list()
        valid_keys = [key for key in available_keys if await key.is_available]
        
        # Cache the results for future requests
        if valid_keys:
            await cache_manager.cache_available_keys(valid_keys)
            return random.choice(valid_keys)
        
        return None

    class Settings:
        name = "api_keys"

    class Config:
        json_schema_extra = {
            "example": {
                "key": "your_api_key_here",
                "rate_limit": 250,
                "requests": 0,
                "next_reset": "2024-05-01T00:00:00",
                "last_used": "2024-04-30T23:59:59",
                "is_active": True
            }
        }