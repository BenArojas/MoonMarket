
from typing import List
from fastapi import APIRouter, HTTPException
from models.APIKeyManager import ApiKey
import aiohttp

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
        

# Get all API keys
@router.get("/api-keys", response_model=List[ApiKey])
async def get_api_keys():
    # Fetch all API keys from the database
    api_keys = await ApiKey.find_all().to_list()
    
    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found")
    
    return api_keys