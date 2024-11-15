from models.APIKeyManager import ApiKey
from fastapi import HTTPException


async def get_api_key():
    api_key = await ApiKey.get_available_key()
    if not api_key:
        raise HTTPException(status_code=429, detail="No available API keys")
    return api_key