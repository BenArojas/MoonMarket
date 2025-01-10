from datetime import datetime, timedelta, time
import random
from typing import Optional, Annotated

import pytz
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
    
    return next_midnight

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
        now = datetime.now()
        if now >= self.next_reset:
            await self.reset_usage(now)
        return self.requests < self.rate_limit and self.is_active

    async def reset_usage(self, now: datetime):
        self.requests = 0
        self.next_reset = self.get_next_reset(now)
        await self.save()

    @staticmethod
    def get_next_reset(from_time: datetime) -> datetime:
        next_day = from_time.date() + timedelta(days=1)
        return datetime.combine(next_day, time.min)

    async def increment_usage(self):
        self.requests += 1
        self.last_used = datetime.now()
        await self.save()

    @classmethod
    async def get_available_key(cls) -> Optional["ApiKey"]:
        available_keys = await cls.find(cls.is_active == True).to_list()
        valid_keys = [key for key in available_keys if await key.is_available]
        return random.choice(valid_keys) if valid_keys else None

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