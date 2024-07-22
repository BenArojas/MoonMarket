from fastapi import Depends, APIRouter
from typing import List
from pydantic import BaseModel
from beanie import PydanticObjectId

class HoldingInfo(BaseModel):
    name: str
    portfolio_percentage: float
    value_change_percentage: float

class FriendInfo(BaseModel):
    id: PydanticObjectId
    username: str
    portfolio_value_change_percentage: float
    holdings: List[HoldingInfo]