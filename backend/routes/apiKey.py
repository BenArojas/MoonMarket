
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from utils.auth_user import get_current_user
from models.APIKeyManager import ApiKey
from models.user import User
import aiohttp
from pydantic import HttpUrl

router = APIRouter( tags=["ApiKey"])

FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"

async def validate_fmp_key(api_key: str) -> bool:
    test_url = f"{FMP_BASE_URL}/stock/list?apikey={api_key}"
    async with aiohttp.ClientSession() as session:
        async with session.get(test_url) as response:
            if response.status == 200:
                data = await response.json()
                return not isinstance(data, dict) or 'Error Message' not in data
            return False
        
@router.post("/add-api-key")
async def add_api_key(api_key: str, user: User = Depends(get_current_user)):
     # Check if the API key already exists in the database
    existing_key = await ApiKey.find_one(ApiKey.key == api_key)
    if existing_key:
        raise HTTPException(status_code=400, detail="This API key is already in use")
    
     # Validate the API key
    is_valid = await validate_fmp_key(api_key)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API key")

    key = ApiKey(key=api_key)
    await key.insert()
    user.enabled = True
    await user.save()
    return {"message": "key added successfully"}

# Get all API keys
@router.get("/api-keys", response_model=List[ApiKey])
async def get_api_keys():
    # Fetch all API keys from the database
    api_keys = await ApiKey.find_all().to_list()
    
    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found")
    
    return api_keys