
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from util.current_user import current_user
from models.APIKeyManager import ApiKey

router = APIRouter( tags=["ApiKey"])

@router.post("/add-api-key")
async def add_api_key(api_key: str, user = Depends(current_user)):
    key = ApiKey(key=api_key)
    await key.insert()
    return {"message": "key added successfully"}

# Get all API keys
@router.get("/api-keys", response_model=List[ApiKey])
async def get_api_keys():
    # Fetch all API keys from the database
    api_keys = await ApiKey.find_all().to_list()
    
    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found")
    
    return api_keys