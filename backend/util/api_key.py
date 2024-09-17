from models.APIKeyManager import ApiKey
from util.current_user import current_user
from fastapi import APIRouter, HTTPException, status, Depends


async def get_api_key(user = Depends(current_user)):
    api_key = await ApiKey.get_available_key()
    if not api_key:
        raise HTTPException(status_code=429, detail="No available API keys")
    return api_key