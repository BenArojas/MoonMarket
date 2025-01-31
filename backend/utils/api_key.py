from models.APIKeyManager import ApiKey
from fastapi import HTTPException
from fastapi import Request


async def get_api_key(request: Request):
    """Get an available API key with caching support."""
    api_key = await ApiKey.get_available_key(request)
    if not api_key:
        raise HTTPException(status_code=429, detail="No available API keys")
    return api_key